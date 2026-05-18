import urllib.request, urllib.error
req = urllib.request.Request('http://127.0.0.1:8000/api/v1/courses?trainer_id=2', headers={'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwiZW1wbG95ZWVfaWQiOiJFTVAwMDIiLCJyb2xlIjoiVFJBSU5FUiIsImV4cCI6MTc3ODgyNjY2NCwidHlwZSI6ImFjY2VzcyJ9.RlaN6nniASzyFGX9DzRgDybF6fG_mPfUxYNm6LUAe8c'})
try:
    print(urllib.request.urlopen(req).read().decode()[:500])
except urllib.error.HTTPError as e:
    print(e.read().decode())
