"""공개 데이터를 내려받고 해시로 원본이 같은지 확인한다. 원문은 git에 올리지 않는다."""
import hashlib
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCES = {
    "hillstrom": {
        "url": "http://www.minethatdata.com/Kevin_Hillstrom_MineThatData_E-MailAnalytics_DataMiningChallenge_2008.03.20.csv",
        "path": ROOT / "data/external/hillstrom/hillstrom.csv",
        "sha256": "0e5893329d8b93cefecc571777672028290ab69865718020c78c7284f291aece",
    },
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def fetch(name: str) -> Path:
    src = SOURCES[name]
    path = src["path"]
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(src["url"], path)
    actual = sha256(path)
    if actual != src["sha256"]:
        raise SystemExit(f"{name}: 해시가 다릅니다. 원본이 바뀌었을 수 있습니다 ({actual}).")
    return path


if __name__ == "__main__":
    for name in sys.argv[1:] or SOURCES:
        print(name, fetch(name))
