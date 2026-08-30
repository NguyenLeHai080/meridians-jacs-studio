PYTHON ?= $(shell if [ -x BE/api-server/.venv/bin/python ]; then echo BE/api-server/.venv/bin/python; else command -v python3; fi)

.PHONY: test-api compile-api export-openapi compose-config

test-api:
	env PYTHONPATH=BE/api-server $(PYTHON) -m pytest -q BE/api-server/tests

compile-api:
	env PYTHONPATH=BE/api-server $(PYTHON) -m compileall -q BE/api-server/app BE/api-server/tests

export-openapi:
	env PYTHONPATH=BE/api-server $(PYTHON) BE/api-server/scripts/export_openapi.py

compose-config:
	docker compose config --quiet
