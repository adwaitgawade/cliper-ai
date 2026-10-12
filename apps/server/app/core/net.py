"""SSRF protection for user-supplied URLs (URL ingest and webhooks)."""

import ipaddress
import socket
from urllib.parse import urlsplit

from app.core.errors import AppError


class UnsafeUrl(AppError):
    code = "unsafe_url"


def _is_public(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped:
        ip = ip.ipv4_mapped
    return ip.is_global and not ip.is_multicast


def assert_public_url(url: str, *, allowed_domains: list[str] | None = None) -> str:
    """Reject URLs that are not http(s) or that resolve to private, loopback, link-local
    or otherwise non-global addresses. Returns the hostname."""
    parts = urlsplit(url)
    if parts.scheme not in ("http", "https"):
        raise UnsafeUrl("Only http and https URLs are allowed")
    host = parts.hostname
    if not host:
        raise UnsafeUrl("URL has no host")
    if parts.username or parts.password:
        raise UnsafeUrl("URLs with credentials are not allowed")
    host = host.lower().rstrip(".")
    if allowed_domains and not any(host == d or host.endswith("." + d) for d in allowed_domains):
        raise UnsafeUrl("This host is not on the allowed list")
    try:
        infos = socket.getaddrinfo(
            host, parts.port or (443 if parts.scheme == "https" else 80), type=socket.SOCK_STREAM
        )
    except socket.gaierror as e:
        raise UnsafeUrl("Host could not be resolved") from e
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if not _is_public(ip):
            raise UnsafeUrl("URL resolves to a non-public address")
    return host
