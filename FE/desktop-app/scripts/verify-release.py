import io
import json
import hashlib
import sys
import urllib.request
import zipfile

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

dl_url = None
# 1. Test check update API
for ver in ['v0.4.3', 'v0.8.15', 'v0.8.16']:
    url = f'https://jacs-studio.nexoratech.com.vn/api/v1/releases/check?platform=windows&current_version={ver}&channel=stable'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    res = urllib.request.urlopen(req)
    data = json.loads(res.read().decode('utf-8'))
    avail = data["data"]["update_available"]
    rel = data["data"]["release"]
    print(f"API check from {ver}: update_available = {avail}")
    if rel:
        dl_url = rel.get('download_url')
        print(f"   Release version: {rel.get('version')}, URL: {dl_url}")
        print(f"   SHA-512 in DB:   {rel.get('sha512')}")

# 2. Download zip from release manifest and check contents & hash
print(f"\nDownloading from manifest URL: {dl_url}...")
req = urllib.request.Request(dl_url, headers={'User-Agent': 'Mozilla/5.0'})
res = urllib.request.urlopen(req)
zip_bytes = res.read()
sha512_dl = hashlib.sha512(zip_bytes).hexdigest()
print(f"\nDownloaded zip size: {len(zip_bytes) / 1024 / 1024:.2f} MB")
print(f"Downloaded zip SHA-512: {sha512_dl}")

zf = zipfile.ZipFile(io.BytesIO(zip_bytes))
print(f"Zip file contents: {zf.namelist()}")
