// Python run inside Pyodide by ytdlp.worker.ts. It plugs a yt-dlp RequestHandler that sends
// every HTTP exchange through the same-origin /api/relay route (via the JS `relay` module the
// worker registers), then exposes `extract(url)` which returns the video info as JSON.
export const BRIDGE_PY = String.raw`
import io, json, urllib.parse, urllib.request
from email.message import Message

import relay
from pyodide.ffi import to_js
from yt_dlp import YoutubeDL
from yt_dlp.networking.common import RequestHandler, Response, register_preference, register_rh
from yt_dlp.networking.exceptions import HTTPError, TransportError

REDIRECTS = (301, 302, 303, 307, 308)


class _CookieResponse:
    """The minimal response interface http.cookiejar needs to read Set-Cookie headers."""

    def __init__(self, pairs):
        self._msg = Message()
        for name, value in pairs:
            self._msg[name] = value

    def info(self):
        return self._msg


def _body(data):
    if data is None or isinstance(data, bytes):
        return data
    if hasattr(data, 'read'):
        return data.read()
    return b''.join(data)


@register_rh
class RelayRH(RequestHandler):
    _SUPPORTED_URL_SCHEMES = ('http', 'https')
    _SUPPORTED_PROXY_SCHEMES = ()
    _SUPPORTED_FEATURES = ()

    def _check_extensions(self, extensions):
        super()._check_extensions(extensions)
        for key in ('cookiejar', 'timeout', 'legacy_ssl', 'keep_header_casing'):
            extensions.pop(key, None)

    def _send(self, request):
        cookiejar = self._get_cookiejar(request)
        headers = self._get_headers(request)
        url, data = request.url, _body(request.data)
        method = request.method or ('POST' if data is not None else 'GET')

        for _ in range(10):
            # urllib's Request is only used so the cookiejar can add the Cookie header.
            ureq = urllib.request.Request(url, headers=headers, method=method)
            cookiejar.add_cookie_header(ureq)
            try:
                res = relay.send(method, url, urllib.parse.quote(json.dumps(dict(ureq.header_items()))),
                                 None if data is None else to_js(data))
            except Exception as e:
                raise TransportError(cause=e) from e
            if res.error:
                raise TransportError(msg=res.error)

            pairs = json.loads(res.headers)
            cookiejar.extract_cookies(_CookieResponse(pairs), ureq)
            location = next((v for k, v in pairs if k.lower() == 'location'), None)
            if res.status in REDIRECTS and location:
                url = urllib.parse.urljoin(url, location)
                if res.status == 303 or (res.status in (301, 302) and method == 'POST'):
                    method, data = 'GET', None
                    headers = {k: v for k, v in headers.items() if k.lower() not in ('content-type', 'content-length')}
                continue

            response = Response(io.BytesIO(bytes(res.body.to_py())), url,
                                {k: v for k, v in pairs if k.lower() != 'set-cookie'}, res.status)
            if res.status >= 400:
                raise HTTPError(response)
            return response
        raise TransportError(msg='Too many redirects')


@register_preference(RelayRH)
def _prefer_relay(rh, request):
    return 10_000


class _Logger:
    def debug(self, msg):
        if not msg.startswith('[debug] '):
            relay.log(msg)

    def info(self, msg):
        relay.log(msg)

    def warning(self, msg):
        relay.log(msg)

    def error(self, msg):
        relay.log(msg)


def _video(info):
    formats = [
        {
            'id': f.get('format_id'),
            'url': f['url'],
            'ext': f.get('ext') or 'mp4',
            'width': f.get('width'),
            'height': f.get('height'),
            'filesize': f.get('filesize') or f.get('filesize_approx'),
            'headers': f.get('http_headers') or {},
        }
        # yt-dlp lists formats worst to best; show best first.
        for f in reversed(info.get('formats') or [])
        # Complete MP4 files only (Instagram's video_versions). DASH formats are split into separate
        # video and audio streams that would need muxing. Their codecs are often unreported.
        if f.get('url') and f.get('protocol') in ('http', 'https')
        and not str(f.get('format_id')).startswith('dash-') and f.get('vcodec') != 'none'
    ]
    return {
        'id': info.get('id'),
        'title': info.get('title') or info.get('description') or info.get('id'),
        'uploader': info.get('uploader') or info.get('channel'),
        'thumbnail': info.get('thumbnail'),
        'duration': info.get('duration'),
        'formats': formats,
    }


def extract(url):
    with YoutubeDL({'quiet': True, 'skip_download': True, 'noplaylist': False, 'logger': _Logger()}) as ydl:
        info = ydl.sanitize_info(ydl.extract_info(url, download=False))
    entries = info.get('entries') if info.get('_type') == 'playlist' else [info]
    return json.dumps([_video(e) for e in entries or [] if e])
`;
