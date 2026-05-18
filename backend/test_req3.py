import urllib.request, urllib.error
req = urllib.request.Request('http://127.0.0.1:8000/api/v1/sessions', headers={'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzIiwiZW1wbG95ZWVfaWQiOiJFTVAwMDMiLCJyb2xlIjoiU1VQRVJWSVNPUiIsImV4cCI6MTc3ODgyODkwMSwidHlwZSI6ImFjY2VzcyJ9.M4GZ8jtei6bXWjlve2vOCQXrvGHAUdvvikk4Ctv9PpM'})
try:
    print(urllib.request.urlopen(req).read().decode()[:500])
except urllib.error.HTTPError as e:
    print(e.read().decode())
