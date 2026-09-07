import os
import sys
import io
import shutil
import subprocess

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

ROOT_DIR = r"d:\PROJECT\Client_Projects\02_Active_Projects_Php83\meridians-jacs-studio\meridians-jacs-studio"
APP_DIR = os.path.join(ROOT_DIR, "FE", "desktop-app")
RELEASE_DIR = os.path.join(APP_DIR, "release")
STAGING_DIR = os.path.join(RELEASE_DIR, "asar_staging")

print("1. Preparing asar staging folder...")
if os.path.exists(STAGING_DIR):
    shutil.rmtree(STAGING_DIR)
os.makedirs(STAGING_DIR, exist_ok=True)

# Copy dist
shutil.copytree(os.path.join(APP_DIR, "dist"), os.path.join(STAGING_DIR, "dist"))
# Copy electron
shutil.copytree(os.path.join(APP_DIR, "electron"), os.path.join(STAGING_DIR, "electron"))
# Copy package.json
shutil.copy2(os.path.join(APP_DIR, "package.json"), os.path.join(STAGING_DIR, "package.json"))

print("2. Packing app.asar with all entrypoints (electron/main.cjs, package.json, dist)...")
asar_out = os.path.join(RELEASE_DIR, "app.asar")
cmd = f'npx asar pack "{STAGING_DIR}" "{asar_out}"'
subprocess.check_call(cmd, shell=True, cwd=APP_DIR)
print(f"✅ Generated proper app.asar ({os.path.getsize(asar_out) / 1024 / 1024:.2f} MB)")

print("3. Distributing to installed programs and portable unpacked directory...")
targets = [
    r"C:\Users\NguyenLeHai\AppData\Local\Programs\jacs-studio\resources\app.asar",
    r"C:\Users\NguyenLeHai\AppData\Local\Programs\JACS Studio\resources\app.asar",
    r"C:\Users\NguyenLeHai\AppData\Local\Programs\@jacsdesktop-app\resources\app.asar",
    os.path.join(RELEASE_DIR, "win-unpacked", "resources", "app.asar"),
]

for t in targets:
    if os.path.exists(os.path.dirname(t)):
        try:
            shutil.copy2(asar_out, t)
            print("✅ Copied to:", t)
        except Exception as e:
            print("❌ Failed copy to:", t, e)

print("🎉 Complete! You can now launch JACS Studio without issues.")
