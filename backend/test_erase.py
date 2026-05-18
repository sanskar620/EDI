from PIL import Image, ImageDraw, ImageFont
import os

img = Image.open('uploads/certificates/Certificate.png')
draw = ImageDraw.Draw(img)
w, h = img.size
print(f'Size: {w}x{h}')

# Erase old text using white rectangles
# Trainee name area
draw.rectangle([(w*0.15, h*0.48), (w*0.85, h*0.56)], fill=(255, 255, 255))
# Course name area
draw.rectangle([(w*0.15, h*0.62), (w*0.85, h*0.67)], fill=(255, 255, 255))
# Supervisor area
draw.rectangle([(w*0.05, h*0.85), (w*0.45, h*0.92)], fill=(255, 255, 255))

try:
    font_large = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 110)
    font_medium = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 50)
    # Using non-bold font
    font_bold = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 38)
except Exception as e:
    print('Font load failed:', e)
    font_large = ImageFont.load_default()
    font_medium = font_large
    font_bold = font_large

DARK = (45, 45, 45)
GRAY = (80, 80, 80)

trainee_name = '"RAJESH KUMAR"'
bbox = draw.textbbox((0, 0), trainee_name, font=font_large)
tw = bbox[2] - bbox[0]
tx = (w - tw) // 2
draw.text((tx, int(h * 0.48)), trainee_name, font=font_large, fill=DARK)

# Draw a line under trainee name
line_y = int(h * 0.58)
draw.line([(w*0.35, line_y), (w*0.65, line_y)], fill=DARK, width=3)

course = 'Fire Safety Training'
course_text = f'Have completed the "{course}" Successfully'
bbox2 = draw.textbbox((0, 0), course_text, font=font_medium)
cw = bbox2[2] - bbox2[0]
cx = (w - cw) // 2
draw.text((cx, int(h * 0.63)), course_text, font=font_medium, fill=GRAY)

supervisor = 'Priya Sharma'
bbox3 = draw.textbbox((0,0), supervisor, font=font_bold)
sw = bbox3[2] - bbox3[0]
# center under course director
draw.text((int(w * 0.31) - sw//2, int(h * 0.865)), supervisor, font=font_bold, fill=DARK)

img.save('uploads/certificates/test_erased.png')
print('Saved test_erased.png')
