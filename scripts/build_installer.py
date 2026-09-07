import os
import sys
import io
import shutil
import subprocess
import zipfile
import hashlib
import paramiko

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

ROOT_DIR = r"d:\PROJECT\Client_Projects\02_Active_Projects_Php83\meridians-jacs-studio\meridians-jacs-studio"
APP_DIR = os.path.join(ROOT_DIR, "FE", "desktop-app")
RELEASE_DIR = os.path.join(APP_DIR, "release")
UNPACKED_DIR = os.path.join(RELEASE_DIR, "win-unpacked")
ASAR_SRC = os.path.join(RELEASE_DIR, "app.asar")
ASAR_DEST = os.path.join(UNPACKED_DIR, "resources", "app.asar")
MAKENSIS = r"C:\Users\NguyenLeHai\AppData\Local\electron-builder\Cache\nsis\nsis-3.0.4.1\makensis.exe"

VERSION = "0.8.28"
EXE_NAME = f"JACS-Studio-Setup-v{VERSION}.exe"
EXE_PATH = os.path.join(RELEASE_DIR, EXE_NAME)
PORTABLE_ZIP_NAME = f"JACS-Studio-v{VERSION}-Portable-win-x64.zip"
PORTABLE_ZIP_PATH = os.path.join(RELEASE_DIR, PORTABLE_ZIP_NAME)

print("1. Updating app.asar inside win-unpacked...")
shutil.copyfile(ASAR_SRC, ASAR_DEST)
print(f"Copied {ASAR_SRC} -> {ASAR_DEST}")

# 2. Generate NSIS installer script
nsi_script_content = f"""!define PRODUCT_NAME "JACS Studio"
!define PRODUCT_VERSION "{VERSION}"
!define PRODUCT_PUBLISHER "NexoraTech"
!define PRODUCT_DIR_REGKEY "Software\\Microsoft\\Windows\\CurrentVersion\\App Paths\\JACS Studio.exe"
!define PRODUCT_UNINST_KEY "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${{PRODUCT_NAME}}"
!define PRODUCT_UNINST_ROOT_KEY "HKLM"

SetCompressor /SOLID lzma

!include "MUI2.nsh"

!define MUI_ABORTWARNING
!define MUI_ICON "${{NSISDIR}}\\Contrib\\Graphics\\Icons\\modern-install.ico"
!define MUI_UNICON "${{NSISDIR}}\\Contrib\\Graphics\\Icons\\modern-uninstall.ico"

; Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_RUN "$INSTDIR\\JACS Studio.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Khởi chạy JACS Studio ngay"
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "Vietnamese"
!insertmacro MUI_LANGUAGE "English"

Name "${{PRODUCT_NAME}} ${{PRODUCT_VERSION}}"
OutFile "{EXE_PATH}"
InstallDir "$PROGRAMFILES64\\JACS Studio"
InstallDirRegKey HKLM "${{PRODUCT_DIR_REGKEY}}" ""
ShowInstDetails show
ShowUnInstDetails show
RequestExecutionLevel admin

Section "MainSection" SEC01
  SetOutPath "$INSTDIR"
  SetOverwrite ifnewer
  
  ; Kill running process if any
  nsExec::Exec 'taskkill /F /IM "JACS Studio.exe"'
  Sleep 500

  File /r "{UNPACKED_DIR}\\*.*"

  ; Shortcuts
  CreateDirectory "$SMPROGRAMS\\JACS Studio"
  CreateShortcut "$SMPROGRAMS\\JACS Studio\\JACS Studio.lnk" "$INSTDIR\\JACS Studio.exe"
  CreateShortcut "$SMPROGRAMS\\JACS Studio\\Gỡ cài đặt.lnk" "$INSTDIR\\uninst.exe"
  CreateShortcut "$DESKTOP\\JACS Studio.lnk" "$INSTDIR\\JACS Studio.exe"
SectionEnd

Section -Post
  WriteUninstaller "$INSTDIR\\uninst.exe"
  WriteRegStr HKLM "${{PRODUCT_DIR_REGKEY}}" "" "$INSTDIR\\JACS Studio.exe"
  WriteRegStr ${{PRODUCT_UNINST_ROOT_KEY}} "${{PRODUCT_UNINST_KEY}}" "DisplayName" "$(^Name)"
  WriteRegStr ${{PRODUCT_UNINST_ROOT_KEY}} "${{PRODUCT_UNINST_KEY}}" "UninstallString" "$INSTDIR\\uninst.exe"
  WriteRegStr ${{PRODUCT_UNINST_ROOT_KEY}} "${{PRODUCT_UNINST_KEY}}" "DisplayIcon" "$INSTDIR\\JACS Studio.exe"
  WriteRegStr ${{PRODUCT_UNINST_ROOT_KEY}} "${{PRODUCT_UNINST_KEY}}" "DisplayVersion" "${{PRODUCT_VERSION}}"
  WriteRegStr ${{PRODUCT_UNINST_ROOT_KEY}} "${{PRODUCT_UNINST_KEY}}" "Publisher" "${{PRODUCT_PUBLISHER}}"
SectionEnd

Function un.onUninstSuccess
  HideWindow
  MessageBox MB_ICONINFORMATION|MB_OK "Đã gỡ cài đặt $(^Name) thành công khỏi máy tính."
FunctionEnd

Function un.onInit
  MessageBox MB_ICONQUESTION|MB_YESNO|MB_DEFBUTTON2 "Bạn có chắc chắn muốn gỡ cài đặt hoàn toàn $(^Name)?" IDYES +2
  Abort
FunctionEnd

Section Uninstall
  ; Kill running process
  nsExec::Exec 'taskkill /F /IM "JACS Studio.exe"'
  Sleep 500

  Delete "$DESKTOP\\JACS Studio.lnk"
  Delete "$SMPROGRAMS\\JACS Studio\\*.*"
  RMDir "$SMPROGRAMS\\JACS Studio"

  RMDir /r "$INSTDIR"

  DeleteRegKey ${{PRODUCT_UNINST_ROOT_KEY}} "${{PRODUCT_UNINST_KEY}}"
  DeleteRegKey HKLM "${{PRODUCT_DIR_REGKEY}}"
  SetAutoClose true
SectionEnd
"""

NSI_PATH = os.path.join(RELEASE_DIR, "installer.nsi")
with open(NSI_PATH, "w", encoding="utf-8") as f:
    f.write(nsi_script_content)

print(f"2. Compiling NSIS script using {MAKENSIS}...")
res = subprocess.run([MAKENSIS, NSI_PATH], capture_output=True, text=True)
if res.returncode != 0:
    print("NSIS Error:", res.stderr)
    print("NSIS Stdout:", res.stdout)
    sys.exit(1)

exe_size_mb = os.path.getsize(EXE_PATH) / (1024 * 1024)
print(f"✅ NSIS Installer compiled successfully: {EXE_PATH} ({exe_size_mb:.2f} MB)")

# 3. Create Portable Zip
print(f"3. Creating Portable Zip: {PORTABLE_ZIP_PATH}...")
with zipfile.ZipFile(PORTABLE_ZIP_PATH, "w", zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(UNPACKED_DIR):
        for file in files:
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, UNPACKED_DIR)
            zf.write(full_path, os.path.join("JACS-Studio", rel_path))

zip_size_mb = os.path.getsize(PORTABLE_ZIP_PATH) / (1024 * 1024)
print(f"✅ Portable Zip created successfully ({zip_size_mb:.2f} MB)")

# 4. Upload both to production server
SERVER = "221.121.1.3"
USER = "root"
PASS = r"4fT0R%GUJgh@a9Vw"
REMOTE_DIR = "/opt/jacs-studio/downloads"

print(f"\n4. Uploading to server {SERVER}:{REMOTE_DIR}...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(SERVER, port=22, username=USER, password=PASS, timeout=20)
sftp = ssh.open_sftp()

print(f"Uploading {EXE_NAME}...")
sftp.put(EXE_PATH, f"{REMOTE_DIR}/{EXE_NAME}")
sftp.put(EXE_PATH, f"{REMOTE_DIR}/JACS-Studio-latest-setup.exe")
sftp.put(EXE_PATH, f"{REMOTE_DIR}/jacs-studio-windows-setup.exe")

print(f"Uploading {PORTABLE_ZIP_NAME}...")
sftp.put(PORTABLE_ZIP_PATH, f"{REMOTE_DIR}/{PORTABLE_ZIP_NAME}")
sftp.put(PORTABLE_ZIP_PATH, f"{REMOTE_DIR}/jacs-studio-windows-latest.zip")

sftp.close()
ssh.close()
print("\n🎉 Done! All installer and portable files uploaded to production server successfully!")
