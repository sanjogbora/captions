from moviepy.editor import VideoFileClip, TextClip, CompositeVideoClip, ImageClip
from moviepy.config import change_settings
from typing import List
import os
from pathlib import Path
import glob
from app.models.caption_models import Caption
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np

# Configure ImageMagick path for Windows
# Try to find ImageMagick automatically in Program Files
def find_imagemagick():
    """Find ImageMagick installation automatically"""

    # Check common installation directories
    search_paths = [
        r"C:\Program Files\ImageMagick*\magick.exe",
        r"C:\Program Files (x86)\ImageMagick*\magick.exe",
    ]

    for search_path in search_paths:
        matches = glob.glob(search_path)
        if matches:
            # Use the first match (usually the most recent version)
            magick_path = matches[0]
            change_settings({"IMAGEMAGICK_BINARY": magick_path})
            print(f"✓ ImageMagick configured at: {magick_path}")
            return True

    # If not found, try the exact path user reported
    exact_path = r"C:\Program Files\ImageMagick-7.1.2-Q16-HDRI\magick.exe"
    if os.path.exists(exact_path):
        change_settings({"IMAGEMAGICK_BINARY": exact_path})
        print(f"✓ ImageMagick configured at: {exact_path}")
        return True

    print("⚠ WARNING: ImageMagick not found in common locations!")
    print("Please install ImageMagick from: https://imagemagick.org/script/download.php#windows")
    print("Or set the IMAGEMAGICK_BINARY environment variable to point to magick.exe")
    return False

# Try to configure ImageMagick on module load
find_imagemagick()

OUTPUT_DIR = Path("outputs")
OUTPUT_DIR.mkdir(exist_ok=True)


def apply_text_transform(text: str, transform: str) -> str:
    """Apply text transformation (uppercase, lowercase, capitalize)"""
    if transform == 'uppercase':
        return text.upper()
    elif transform == 'lowercase':
        return text.lower()
    elif transform == 'capitalize':
        return text.capitalize()
    return text


def hex_to_rgb(hex_color: str) -> tuple:
    """Convert hex color to RGB tuple"""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))


def parse_text_shadow(text_shadow: str) -> dict:
    """Parse CSS text-shadow string into components"""
    # Example: "2px 2px 4px rgba(0,0,0,0.8)" or "0px 0px 10px rgba(255,255,255,0.8)"
    import re

    # Try to parse shadow parameters
    pattern = r'(-?\d+)px\s+(-?\d+)px\s+(\d+)px\s+rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)'
    match = re.search(pattern, text_shadow)

    if match:
        offset_x = int(match.group(1))
        offset_y = int(match.group(2))
        blur = int(match.group(3))
        r, g, b = int(match.group(4)), int(match.group(5)), int(match.group(6))
        alpha = float(match.group(7)) if match.group(7) else 1.0

        return {
            'offset_x': offset_x,
            'offset_y': offset_y,
            'blur': blur,
            'color': (r, g, b, int(alpha * 255))
        }

    return None


def create_text_with_moviepy(caption, font_size: int, scale_x: float, scale_y: float):
    """Create text clip using MoviePy TextClip for simple styling"""
    try:
        # Apply text transform
        text = apply_text_transform(caption.word, caption.style.textTransform)

        # Get font and ensure it's never None
        font_family = map_font_family(caption.style.fontFamily, caption.style.fontWeight)
        if not font_family:
            font_family = "Arial"

        # Build TextClip parameters
        text_params = {
            'fontsize': font_size,
            'font': font_family,
            'color': caption.style.color,
            'method': 'label',
        }

        # Only add stroke if it's actually enabled
        if caption.style.strokeColor and caption.style.strokeWidth and caption.style.strokeWidth > 0:
            text_params['stroke_color'] = caption.style.strokeColor
            text_params['stroke_width'] = int(caption.style.strokeWidth * min(scale_x, scale_y))

        # Only add background if it's actually enabled (and fully opaque)
        if caption.style.backgroundColor and caption.style.backgroundOpacity >= 0.99:
            text_params['bg_color'] = caption.style.backgroundColor

        # Create text clip
        txt_clip = TextClip(text, **text_params)

        return txt_clip

    except Exception as e:
        print(f"  Error in create_text_with_moviepy: {e}")
        import traceback
        traceback.print_exc()
        return None


def create_text_with_pil(caption, font_size: int, scale_x: float, scale_y: float):
    """Create text clip using PIL for complex styling (shadows, letter spacing, rotation, etc.)"""
    try:
        # Apply text transform
        text = apply_text_transform(caption.word, caption.style.textTransform)

        # Get font path
        font_family = map_font_family(caption.style.fontFamily, caption.style.fontWeight)

        # Try to load the font (fallback to default if not found)
        try:
            # Try Windows font paths
            font_paths = [
                f"C:\\Windows\\Fonts\\{font_family}.ttf",
                f"C:\\Windows\\Fonts\\{font_family.lower()}.ttf",
                f"C:\\Windows\\Fonts\\{font_family}bd.ttf",  # Bold variant
                "C:\\Windows\\Fonts\\arial.ttf",  # Fallback
            ]
            font = None
            for path in font_paths:
                if os.path.exists(path):
                    font = ImageFont.truetype(path, font_size)
                    break

            if font is None:
                font = ImageFont.load_default()
        except:
            font = ImageFont.load_default()

        # Calculate text size with letter spacing
        letter_spacing_scaled = int(caption.style.letterSpacing * min(scale_x, scale_y))

        # Create a temporary draw object to measure text
        temp_img = Image.new('RGBA', (1, 1))
        temp_draw = ImageDraw.Draw(temp_img)

        # Calculate total width with letter spacing
        total_width = 0
        char_widths = []
        for char in text:
            bbox = temp_draw.textbbox((0, 0), char, font=font)
            char_width = bbox[2] - bbox[0]
            char_widths.append(char_width)
            total_width += char_width + letter_spacing_scaled

        total_width -= letter_spacing_scaled  # Remove last spacing

        # Get text height
        bbox = temp_draw.textbbox((0, 0), text, font=font)
        text_height = bbox[3] - bbox[1]

        # Add padding for background
        padding_x = int(16 * min(scale_x, scale_y)) if caption.style.backgroundColor else 0
        padding_y = int(8 * min(scale_x, scale_y)) if caption.style.backgroundColor else 0

        # Add extra space for shadows and effects
        shadow_info = parse_text_shadow(caption.style.textShadow) if caption.style.textShadow else None
        shadow_margin = 20 if shadow_info else 0

        # Calculate stroke width
        stroke_width = int(caption.style.strokeWidth * min(scale_x, scale_y)) if caption.style.strokeWidth else 0

        # Create image with extra space for effects
        img_width = total_width + (padding_x * 2) + (stroke_width * 4) + shadow_margin
        img_height = text_height + (padding_y * 2) + (stroke_width * 4) + shadow_margin

        img = Image.new('RGBA', (img_width, img_height), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)

        # Calculate starting position (centered in the extra space)
        start_x = padding_x + (stroke_width * 2) + (shadow_margin // 2)
        start_y = padding_y + (stroke_width * 2) + (shadow_margin // 2)

        # Draw background if enabled
        if caption.style.backgroundColor:
            bg_color = hex_to_rgb(caption.style.backgroundColor)
            bg_alpha = int(caption.style.backgroundOpacity * 255)
            bg_color_with_alpha = bg_color + (bg_alpha,)

            border_radius = int(4 * min(scale_x, scale_y))
            # Draw rounded rectangle for background
            draw.rounded_rectangle(
                [(0, 0), (total_width + padding_x * 2, text_height + padding_y * 2)],
                radius=border_radius,
                fill=bg_color_with_alpha
            )

        # Draw text shadow if enabled
        if shadow_info:
            shadow_layer = Image.new('RGBA', (img_width, img_height), (0, 0, 0, 0))
            shadow_draw = ImageDraw.Draw(shadow_layer)

            # Draw shadow text
            x_pos = start_x + shadow_info['offset_x']
            for i, char in enumerate(text):
                shadow_draw.text(
                    (x_pos, start_y + shadow_info['offset_y']),
                    char,
                    font=font,
                    fill=shadow_info['color']
                )
                x_pos += char_widths[i] + letter_spacing_scaled

            # Apply blur to shadow
            if shadow_info['blur'] > 0:
                shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(shadow_info['blur'] / 2))

            # Composite shadow onto main image
            img = Image.alpha_composite(img, shadow_layer)
            draw = ImageDraw.Draw(img)

        # Draw stroke (outline) if enabled
        if stroke_width > 0 and caption.style.strokeColor:
            stroke_color = hex_to_rgb(caption.style.strokeColor) + (255,)
            x_pos = start_x
            for i, char in enumerate(text):
                # Draw outline by drawing text in multiple positions
                for dx in range(-stroke_width, stroke_width + 1):
                    for dy in range(-stroke_width, stroke_width + 1):
                        if dx*dx + dy*dy <= stroke_width*stroke_width:
                            draw.text(
                                (x_pos + dx, start_y + dy),
                                char,
                                font=font,
                                fill=stroke_color
                            )
                x_pos += char_widths[i] + letter_spacing_scaled

        # Draw main text with letter spacing
        text_color = hex_to_rgb(caption.style.color) + (255,)
        x_pos = start_x
        for i, char in enumerate(text):
            draw.text((x_pos, start_y), char, font=font, fill=text_color)
            x_pos += char_widths[i] + letter_spacing_scaled

        # Apply rotation if needed
        if caption.style.rotation != 0:
            img = img.rotate(-caption.style.rotation, expand=True, resample=Image.BICUBIC)

        # Convert PIL image to numpy array for MoviePy
        img_array = np.array(img)

        # Create ImageClip from the array
        img_clip = ImageClip(img_array, transparent=True)

        return img_clip

    except Exception as e:
        print(f"  Error in create_text_with_pil: {e}")
        import traceback
        traceback.print_exc()
        return None


def render_video_with_captions(
    video_path: str,
    captions: List[Caption],
    output_format: str = "mp4",
    quality: str = "high"
) -> str:
    """
    Render video with captions burned in using MoviePy
    """

    # Load video
    video = VideoFileClip(video_path)

    # Reference dimensions used in the editor
    REFERENCE_WIDTH = 800
    REFERENCE_HEIGHT = 450

    # Scale factors
    scale_x = video.w / REFERENCE_WIDTH
    scale_y = video.h / REFERENCE_HEIGHT

    # Create text clips for each caption
    text_clips = []

    for caption in captions:
        try:
            # Scale position from reference to actual video dimensions
            actual_x = caption.position.x * scale_x
            actual_y = caption.position.y * scale_y

            # Scale font size proportionally
            actual_font_size = int(caption.style.fontSize * min(scale_x, scale_y))

            print(f"Processing caption '{caption.word}': pos=({actual_x:.1f}, {actual_y:.1f}), fontSize={actual_font_size}")

            # Check if we need complex rendering (text shadow, letter spacing, etc.)
            needs_complex_rendering = (
                caption.style.textShadow is not None or
                caption.style.letterSpacing != 0 or
                caption.style.rotation != 0 or
                (caption.style.backgroundColor and caption.style.backgroundOpacity < 1.0)
            )

            if needs_complex_rendering:
                # Use PIL for complex rendering
                txt_clip = create_text_with_pil(
                    caption=caption,
                    font_size=actual_font_size,
                    scale_x=scale_x,
                    scale_y=scale_y
                )
            else:
                # Use MoviePy TextClip for simple rendering
                txt_clip = create_text_with_moviepy(
                    caption=caption,
                    font_size=actual_font_size,
                    scale_x=scale_x,
                    scale_y=scale_y
                )

            if txt_clip is None:
                print(f"  ⚠ Failed to create caption for '{caption.word}'")
                continue

            # Position
            txt_clip = txt_clip.set_position((actual_x, actual_y))

            # Set timing
            txt_clip = txt_clip.set_start(caption.startTime)
            txt_clip = txt_clip.set_duration(caption.endTime - caption.startTime)

            # Apply animation
            txt_clip = apply_animation(txt_clip, caption.style.animation)

            text_clips.append(txt_clip)
            print(f"  ✓ Successfully created caption for '{caption.word}'")
        except Exception as e:
            print(f"Error creating text clip for word '{caption.word}': {e}")
            import traceback
            traceback.print_exc()
            continue

    # Composite video with all text clips
    print(f"\n✓ Created {len(text_clips)} out of {len(captions)} text clips")
    if text_clips:
        final_video = CompositeVideoClip([video] + text_clips)
    else:
        print("⚠ WARNING: No text clips were created! Video will have no captions.")
        final_video = video

    # Output path
    output_filename = f"{os.path.basename(video_path).split('.')[0]}_captioned.{output_format}"
    output_path = OUTPUT_DIR / output_filename

    # Render
    codec = "libx264" if quality == "high" else "mpeg4"
    final_video.write_videofile(
        str(output_path),
        codec=codec,
        audio_codec="aac",
        fps=video.fps,
        preset="medium" if quality == "high" else "fast"
    )

    # Cleanup
    video.close()
    final_video.close()

    return str(output_path)


def map_font_family(font_family, font_weight: int = 400) -> str:
    """Map web fonts to system fonts with weight support"""
    # Handle None or empty font family
    if not font_family:
        print(f"⚠ Warning: font_family is None or empty, defaulting to Arial")
        return "Arial" if font_weight < 600 else "Arial-Bold"

    # Determine if bold variant is needed
    is_bold = font_weight >= 600

    # Base font mapping
    font_map = {
        # Map web fonts to system fonts (normal weight)
        "Montserrat, sans-serif": "Arial",
        "Impact, sans-serif": "Impact",
        "Bebas Neue, sans-serif": "Arial-Black",
        "Caveat, cursive": "Comic-Sans-MS",
        "Arial, sans-serif": "Arial",
        "Helvetica, sans-serif": "Helvetica",
        "Times New Roman, serif": "Times-New-Roman",
        "Georgia, serif": "Georgia",
        "Courier New, monospace": "Courier-New",
        "Verdana, sans-serif": "Verdana",
        "Comic Sans MS, cursive": "Comic-Sans-MS",
    }

    # Bold variants
    font_map_bold = {
        "Montserrat, sans-serif": "Arial-Bold",
        "Impact, sans-serif": "Impact",  # Impact is already bold
        "Bebas Neue, sans-serif": "Arial-Black",  # Already bold
        "Caveat, cursive": "Comic-Sans-MS-Bold",
        "Arial, sans-serif": "Arial-Bold",
        "Helvetica, sans-serif": "Helvetica-Bold",
        "Times New Roman, serif": "Times-New-Roman-Bold",
        "Georgia, serif": "Georgia-Bold",
        "Courier New, monospace": "Courier-New-Bold",
        "Verdana, sans-serif": "Verdana-Bold",
        "Comic Sans MS, cursive": "Comic-Sans-MS-Bold",
    }

    # Choose appropriate map based on weight
    active_map = font_map_bold if is_bold else font_map

    # If exact match exists, use it
    if font_family in active_map:
        mapped_font = active_map[font_family]
        print(f"  Font mapping: '{font_family}' (weight={font_weight}) -> '{mapped_font}'")
        return mapped_font

    # Otherwise, try to extract just the font name (for custom fonts)
    # e.g., "MyFont, sans-serif" -> "MyFont"
    font_name = font_family.split(',')[0].strip()

    # Remove quotes if present
    font_name = font_name.strip('"').strip("'")

    # Replace spaces with hyphens for system fonts
    font_name_safe = font_name.replace(' ', '-')

    # Add Bold suffix if needed
    if is_bold and not font_name_safe.endswith('Bold'):
        font_name_safe += '-Bold'

    print(f"  Font mapping (custom): '{font_family}' (weight={font_weight}) -> '{font_name_safe}'")
    return font_name_safe


def apply_animation(clip, animation_type: str):
    """Apply animation to text clip"""

    if animation_type == "none":
        # No animation - instant appear/disappear
        return clip

    elif animation_type == "fade":
        return clip.crossfadein(0.2).crossfadeout(0.2)

    elif animation_type == "pop":
        # Scale from 0 to 1
        return clip.resize(lambda t: min(1, t * 5))

    elif animation_type == "slide_up":
        # Slide from bottom
        def pos_func(t):
            return (clip.pos[0], clip.pos[1] - t * 50)
        return clip.set_position(pos_func)

    elif animation_type == "slide_down":
        # Slide from top
        def pos_func(t):
            return (clip.pos[0], clip.pos[1] + t * 50)
        return clip.set_position(pos_func)

    elif animation_type == "bounce":
        # Bounce effect
        import numpy as np
        def bounce(t):
            return 1 + abs(np.sin(t * 10)) * 0.2
        return clip.resize(bounce)

    elif animation_type == "typewriter":
        # Typewriter effect (fade in quickly)
        return clip.crossfadein(0.1)

    else:
        # Unknown animation type - no animation
        return clip
