import urllib.request, urllib.error
TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzIiwiZW1wbG95ZWVfaWQiOiJFTVAwMDMiLCJyb2xlIjoiU1VQRVJWSVNPUiIsImV4cCI6MTc3ODgyODkwMSwidHlwZSI6ImFjY2VzcyJ9.M4GZ8jtei6bXWjlve2vOCQXrvGHAUdvvikk4Ctv9PpM'

def test(url, label):
    req = urllib.request.Request(url, headers={'Authorization': f'Bearer {TOKEN}'})
    try:
        data = urllib.request.urlopen(req).read().decode()
        print(f"[OK] {label}: {data[:200]}")
    except urllib.error.HTTPError as e:
        print(f"[ERR] {label}: {e.read().decode()[:200]}")

test('http://127.0.0.1:8000/api/v1/sessions', 'sessions')
test('http://127.0.0.1:8000/api/v1/courses', 'courses')
test('http://127.0.0.1:8000/api/v1/users?role=TRAINER', 'trainers')
