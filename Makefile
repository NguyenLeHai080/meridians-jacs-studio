.PHONY: test-api compile-api export-openapi compose-config

test-api:
	env PYTHONPATH=BE/api-server python3 -m pytest -q BE/api-server/tests

compile-api:
	env PYTHONPATH=BE/api-server python3 -m compileall -q BE/api-server/app BE/api-server/tests

export-openapi:
	env PYTHONPATH=BE/api-server python3 BE/api-server/scripts/export_openapi.py

compose-config:
	docker compose config --quiet
