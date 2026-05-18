from PIL import Image, ImageDraw, ImageFont
import os

img = Image.open('uploads/certificates/Certificate.png')
draw = ImageDraw.Draw(img)
w, h = img.size
print(f'Size: {w}x{h}')

try:
    font_large = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 110)
    font_medium = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 56)
    font_bold = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 68)
    print('Using Arial fonts')
except Exception as e:
    print('Font load failed:', e)
    font_large = ImageFont.load_default()
    font_medium = font_large
    font_bold = font_large

DARK = (45, 45, 45)
GRAY = (80, 80, 80)

trainee_name = 'RAJESH KUMAR'
label = '"' + trainee_name + '"'
bbox = draw.textbbox((0, 0), label, font=font_large)
tw = bbox[2] - bbox[0]
tx = (w - tw) // 2
draw.text((tx, int(h * 0.38)), label, font=font_large, fill=DARK)

course = 'Fire Safety Training'
course_text = 'Have completed the "' + course + '" Successfully'
bbox2 = draw.textbbox((0, 0), course_text, font=font_medium)
cw = bbox2[2] - bbox2[0]
cx = (w - cw) // 2
draw.text((cx, int(h * 0.565)), course_text, font=font_medium, fill=GRAY)

supervisor = 'Priya Sharma'
sup_label = '"' + supervisor + '"'
draw.text((int(w * 0.195), int(h * 0.835)), sup_label, font=font_bold, fill=DARK)

img.save('uploads/certificates/test_output.png')
print('Saved test_output.png')
