import subprocess

out = subprocess.check_output('tasklist /FO CSV /NH', shell=True).decode('cp1252', errors='ignore')
for line in out.splitlines():
    parts = line.replace('"', '').split(',')
    if len(parts) > 1:
        name = parts[0].lower()
        if 'jacs' in name or 'electron' in name or 'studio' in name:
            print("RUNNING EXE:", parts[0], "PID:", parts[1])
