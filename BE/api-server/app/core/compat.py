from enum import Enum

try:
    from enum import StrEnum
except ImportError:  # pragma: no cover - compatibility for local Python 3.9
    class StrEnum(str, Enum):
        pass
