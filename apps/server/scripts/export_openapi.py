"""Print the OpenAPI schema as JSON (used to generate the web app's API types).

    uv run python -m scripts.export_openapi > openapi.json
"""

import json
import os

os.environ.setdefault("CLIPPRO_ENV_FILE", "")  # the schema doesn't depend on credentials

from app.main import create_app  # noqa: E402

print(json.dumps(create_app().openapi(), indent=2))
