"""공개 데이터를 내려받고 해시로 원본이 같은지 확인한다. 원문은 git에 올리지 않는다."""
import hashlib
import sys
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCES = {
    "hillstrom": {
        "url": "http://www.minethatdata.com/Kevin_Hillstrom_MineThatData_E-MailAnalytics_DataMiningChallenge_2008.03.20.csv",
        "path": ROOT / "data/external/hillstrom/hillstrom.csv",
        "sha256": "0e5893329d8b93cefecc571777672028290ab69865718020c78c7284f291aece",
    },
    "online_retail_ii": {
        "url": "https://archive.ics.uci.edu/static/public/502/online+retail+ii.zip",
        "path": ROOT / "data/external/online_retail_ii/online_retail_ii.zip",
        "sha256": "572e36277c2390fbfde10664750731e0a86f55e33470d91919085f0408e67bfb",
        "member": "online_retail_II.xlsx",
    },
    # Criteo 공식 링크(go.criteo.net)는 2026-10 기준 404라 libuplift가 쓰는 미러에서 받는다. 해시는 libuplift와 같다.
    "criteo": {
        "url": "https://github.com/jszymon/uplift_sklearn_data/releases/download/Criteo/criteo-research-uplift-v2.1.csv.gz",
        "page": "https://ailab.criteo.com/criteo-uplift-prediction-dataset/",
        "path": ROOT / "data/external/criteo/criteo-research-uplift-v2.1.csv.gz",
        "sha256": "2716e1bf0fd157a93b5bf86924d9088419dfbac2022c6cd90030220634f616dc",
        "optional": True,  # 311MB라 이름을 줄 때만 받는다: python -I analysis/fetch_data.py criteo
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
    if "member" in src:
        out = path.parent / src["member"]
        if not out.exists():
            with zipfile.ZipFile(path) as z:
                out.write_bytes(z.read(src["member"]))
        return out
    return path


if __name__ == "__main__":
    for name in sys.argv[1:] or [k for k, v in SOURCES.items() if not v.get("optional")]:
        print(name, fetch(name))
