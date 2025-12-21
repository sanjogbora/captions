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


def get_moviepy_font_name(font_family: str, font_weight: int) -> str:
    """Get a font name that MoviePy/ImageMagick can use"""
    # Extract base font name from CSS font-family
    base_font = font_family.split(',')[0].strip().strip('"').strip("'")
    is_bold = font_weight >= 600
    
    # Map common web fonts to ImageMagick-compatible names
    font_map = {
        "Montserrat": "Arial" if not is_bold else "Arial-Bold",
        "Impact": "Impact",
        "Bebas Neue": "Impact",  # Similar display font
        "Caveat": "Comic-Sans-MS",  # Casual script fallback
        "Arial": "Arial" if not is_bold else "Arial-Bold",
        "Helvetica": "Arial" if not is_bold else "Arial-Bold",
        "Times New Roman": "Times-New-Roman" if not is_bold else "Times-New-Roman-Bold",
        "Georgia": "Georgia" if not is_bold else "Georgia-Bold",
        "Courier New": "Courier-New" if not is_bold else "Courier-New-Bold",
        "Verdana": "Verdana" if not is_bold else "Verdana-Bold",
        "Comic Sans MS": "Comic-Sans-MS",
        "Tahoma": "Tahoma" if not is_bold else "Tahoma-Bold",
    }
    
    mapped = font_map.get(base_font)
    if mapped:
        print(f"  Font mapping: '{base_font}' (weight={font_weight}) -> '{mapped}'")
        return mapped
    
    # Default fallback
    default = "Arial-Bold" if is_bold else "Arial"
    print(f"  Font mapping (fallback): '{base_font}' (weight={font_weight}) -> '{default}'")
    return default


def create_text_with_moviepy(caption, font_size: int, scale_x: float, scale_y: float):
    """Create text clip using MoviePy TextClip for simple styling"""
    try:
        # Apply text transform
        text = apply_text_transform(caption.word, caption.style.textTransform)

        # Get font name for MoviePy/ImageMagick
        font_name = get_moviepy_font_name(caption.style.fontFamily, caption.style.fontWeight)

        # Build TextClip parameters
        text_params = {
            'fontsize': font_size,
            'font': font_name,
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


def get_font_for_pil(font_family: str, font_weight: int, font_size: int):
    """Get a PIL font object with proper fallback handling"""
    # Common Windows font file mappings
    font_file_map = {
        # Sans-serif fonts
        "arial": "arial.ttf",
        "arial-bold": "arialbd.ttf",
        "helvetica": "arial.ttf",  # Helvetica fallback to Arial on Windows
        "verdana": "verdana.ttf",
        "verdana-bold": "verdanab.ttf",
        "tahoma": "tahoma.ttf",
        "tahoma-bold": "tahomabd.ttf",
        "trebuchet ms": "trebuc.ttf",
        "trebuchet ms-bold": "trebucbd.ttf",
        "segoe ui": "segoeui.ttf",
        "segoe ui-bold": "segoeuib.ttf",
        # Serif fonts
        "times new roman": "times.ttf",
        "times new roman-bold": "timesbd.ttf",
        "georgia": "georgia.ttf",
        "georgia-bold": "georgiab.ttf",
        # Monospace fonts
        "courier new": "cour.ttf",
        "courier new-bold": "courbd.ttf",
        "consolas": "consola.ttf",
        "consolas-bold": "consolab.ttf",
        # Display fonts
        "impact": "impact.ttf",
        "comic sans ms": "comic.ttf",
        "comic sans ms-bold": "comicbd.ttf",
        # Modern fonts that might be installed
        "montserrat": "Montserrat-Regular.ttf",
        "montserrat-bold": "Montserrat-Bold.ttf",
        "bebas neue": "BebasNeue-Regular.ttf",
        "caveat": "Caveat-Regular.ttf",
    }
    
    # Extract base font name from CSS font-family
    base_font = font_family.split(',')[0].strip().strip('"').strip("'").lower()
    is_bold = font_weight >= 600
    
    # Try to find the font file
    font_key = f"{base_font}-bold" if is_bold else base_font
    font_file = font_file_map.get(font_key) or font_file_map.get(base_font)
    
    # Common font directories
    font_dirs = [
        "C:\\Windows\\Fonts",
        os.path.expanduser("~\\AppData\\Local\\Microsoft\\Windows\\Fonts"),
    ]
    
    # Try to load the specific font
    if font_file:
        for font_dir in font_dirs:
            font_path = os.path.join(font_dir, font_file)
            if os.path.exists(font_path):
                try:
                    return ImageFont.truetype(font_path, font_size)
                except Exception as e:
                    print(f"  Failed to load font {font_path}: {e}")
    
    # Fallback: try common fonts
    fallback_fonts = ["arial.ttf", "arialbd.ttf" if is_bold else "arial.ttf", "segoeui.ttf"]
    for fallback in fallback_fonts:
        for font_dir in font_dirs:
            font_path = os.path.join(font_dir, fallback)
            if os.path.exists(font_path):
                try:
                    return ImageFont.truetype(font_path, font_size)
                except:
                    continue
    
    # Last resort: default font
    print(f"  Warning: Using default font for '{font_family}'")
    return ImageFont.load_default()


def create_text_with_pil(caption, font_size: int, scale_x: float, scale_y: float):
    """
    Create text clip using PIL for ALL caption rendering.
    This ensures consistent output that matches the frontend CSS rendering.
    """
    try:
        # Apply text transform
        text = apply_text_transform(caption.word, caption.style.textTransform)
        
        if not text:
            print(f"  Warning: Empty text for caption")
            return None

        # Get font using improved font loading
        font = get_font_for_pil(caption.style.fontFamily, caption.style.fontWeight, font_size)

        # Calculate text size with letter spacing
        scale_factor = min(scale_x, scale_y)
        letter_spacing_scaled = int(caption.style.letterSpacing * scale_factor) if caption.style.letterSpacing else 0

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

        total_width -= letter_spacing_scaled if len(text) > 0 else 0  # Remove last spacing
        
        # Ensure minimum width
        total_width = max(total_width, 10)

        # Get text height using full text for accurate measurement
        bbox = temp_draw.textbbox((0, 0), text, font=font)
        text_height = max(bbox[3] - bbox[1], font_size)
        text_baseline_offset = bbox[1]  # Offset from top to baseline

        # Add padding for background (matching frontend: 8px vertical, 16px horizontal)
        has_background = caption.style.backgroundColor is not None
        padding_x = int(16 * scale_factor) if has_background else 0
        padding_y = int(8 * scale_factor) if has_background else 0

        # Calculate stroke width
        stroke_width = int(caption.style.strokeWidth * scale_factor) if caption.style.strokeWidth and caption.style.strokeWidth > 0 else 0

        # Parse shadow info and scale it
        shadow_info = None
        if caption.style.textShadow:
            shadow_info = parse_text_shadow(caption.style.textShadow)
            if shadow_info:
                # Scale shadow parameters to match video dimensions
                shadow_info['offset_x'] = int(shadow_info['offset_x'] * scale_factor)
                shadow_info['offset_y'] = int(shadow_info['offset_y'] * scale_factor)
                shadow_info['blur'] = max(1, int(shadow_info['blur'] * scale_factor))
        
        # Calculate margins needed for effects (minimum margin of 2 pixels)
        shadow_offset_x = (abs(shadow_info['offset_x']) + shadow_info['blur'] + 2) if shadow_info else 2
        shadow_offset_y = (abs(shadow_info['offset_y']) + shadow_info['blur'] + 2) if shadow_info else 2
        effect_margin_x = max(stroke_width * 2 + 2, shadow_offset_x)
        effect_margin_y = max(stroke_width * 2 + 2, shadow_offset_y)

        # Create image with exact size needed
        content_width = total_width + (padding_x * 2)
        content_height = text_height + (padding_y * 2)
        img_width = content_width + (effect_margin_x * 2)
        img_height = content_height + (effect_margin_y * 2)

        img = Image.new('RGBA', (int(img_width), int(img_height)), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)

        # Calculate starting position for text (accounting for margins)
        text_start_x = effect_margin_x + padding_x
        text_start_y = effect_margin_y + padding_y - text_baseline_offset

        # Draw background if enabled
        if caption.style.backgroundColor:
            bg_color = hex_to_rgb(caption.style.backgroundColor)
            bg_alpha = int(caption.style.backgroundOpacity * 255)
            bg_color_with_alpha = bg_color + (bg_alpha,)

            border_radius = int(4 * scale_factor)
            # Draw rounded rectangle for background at the correct position
            bg_left = effect_margin_x
            bg_top = effect_margin_y
            bg_right = effect_margin_x + content_width
            bg_bottom = effect_margin_y + content_height
            
            draw.rounded_rectangle(
                [(bg_left, bg_top), (bg_right, bg_bottom)],
                radius=border_radius,
                fill=bg_color_with_alpha
            )

        # Draw text shadow if enabled
        if shadow_info:
            shadow_layer = Image.new('RGBA', (int(img_width), int(img_height)), (0, 0, 0, 0))
            shadow_draw = ImageDraw.Draw(shadow_layer)

            # Draw shadow text with offset
            x_pos = text_start_x + shadow_info['offset_x']
            y_pos = text_start_y + shadow_info['offset_y']
            
            for i, char in enumerate(text):
                shadow_draw.text(
                    (x_pos, y_pos),
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
            x_pos = text_start_x
            for i, char in enumerate(text):
                # Draw outline by drawing text in multiple positions (circular pattern)
                for dx in range(-stroke_width, stroke_width + 1):
                    for dy in range(-stroke_width, stroke_width + 1):
                        if dx*dx + dy*dy <= stroke_width*stroke_width:
                            draw.text(
                                (x_pos + dx, text_start_y + dy),
                                char,
                                font=font,
                                fill=stroke_color
                            )
                x_pos += char_widths[i] + letter_spacing_scaled

        # Draw main text with letter spacing
        text_color = hex_to_rgb(caption.style.color) + (255,)
        x_pos = text_start_x
        for i, char in enumerate(text):
            draw.text((x_pos, text_start_y), char, font=font, fill=text_color)
            x_pos += char_widths[i] + letter_spacing_scaled

        # Apply rotation if needed
        if caption.style.rotation != 0:
            img = img.rotate(-caption.style.rotation, expand=True, resample=Image.BICUBIC)

        # Convert PIL image to numpy array for MoviePy
        img_array = np.array(img)

        # Create ImageClip from the array
        img_clip = ImageClip(img_array, transparent=True)
        
        # Store the effect margin so we can adjust position later
        img_clip.effect_margin_x = effect_margin_x
        img_clip.effect_margin_y = effect_margin_y

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
    Render video with captions burned in using MoviePy.
    
    IMPORTANT: Always uses PIL rendering for consistency with the frontend preview.
    The frontend uses CSS which PIL can replicate more accurately than ImageMagick.
    """
    print("\n" + "="*60)
    print("STARTING VIDEO RENDER")
    print("="*60)

    # Load video
    video = VideoFileClip(video_path)

    # Reference dimensions used in the editor (must match frontend REFERENCE_WIDTH/HEIGHT)
    REFERENCE_WIDTH = 800
    REFERENCE_HEIGHT = 450

    # Scale factors from reference to actual video dimensions
    scale_x = video.w / REFERENCE_WIDTH
    scale_y = video.h / REFERENCE_HEIGHT
    scale_factor = min(scale_x, scale_y)

    print(f"\nVideo dimensions: {video.w}x{video.h}")
    print(f"Reference dimensions: {REFERENCE_WIDTH}x{REFERENCE_HEIGHT}")
    print(f"Scale factors: x={scale_x:.3f}, y={scale_y:.3f}, uniform={scale_factor:.3f}")
    
    # Log all captions received
    print(f"\n--- RECEIVED {len(captions)} CAPTIONS ---")
    for i, cap in enumerate(captions):
        print(f"  [{i}] '{cap.word}' | time: {cap.startTime:.2f}-{cap.endTime:.2f}s | pos: ({cap.position.x:.1f}, {cap.position.y:.1f}) | font: {cap.style.fontSize}px | animation: {cap.style.animation}")
    print("---")

    # Create text clips for each caption
    text_clips = []
    processed_ids = set()  # Track processed caption IDs to avoid duplicates

    for caption in captions:
        # Skip if we've already processed this caption ID
        if caption.id in processed_ids:
            print(f"  ⚠ SKIPPING DUPLICATE caption ID: {caption.id}")
            continue
        processed_ids.add(caption.id)
        
        try:
            # Scale position from reference to actual video dimensions
            actual_x = caption.position.x * scale_x
            actual_y = caption.position.y * scale_y

            # Scale font size proportionally (using uniform scale to maintain aspect ratio)
            actual_font_size = int(caption.style.fontSize * scale_factor)

            print(f"Processing caption '{caption.word}':")
            print(f"  Reference pos: ({caption.position.x:.1f}, {caption.position.y:.1f})")
            print(f"  Actual pos: ({actual_x:.1f}, {actual_y:.1f})")
            print(f"  Font size: {caption.style.fontSize} -> {actual_font_size}")
            print(f"  Animation: {caption.style.animation}")

            # ALWAYS use PIL for consistent rendering
            # This ensures the export matches the preview exactly
            txt_clip = create_text_with_pil(
                caption=caption,
                font_size=actual_font_size,
                scale_x=scale_x,
                scale_y=scale_y
            )
            
            # Adjust position to account for effect margins in PIL image
            if txt_clip is not None and hasattr(txt_clip, 'effect_margin_x'):
                actual_x -= txt_clip.effect_margin_x
                actual_y -= txt_clip.effect_margin_y
                print(f"  Adjusted pos for margins: ({actual_x:.1f}, {actual_y:.1f})")

            if txt_clip is None:
                print(f"  ⚠ Failed to create caption for '{caption.word}'")
                continue

            # Position the clip
            txt_clip = txt_clip.set_position((actual_x, actual_y))

            # Set timing
            txt_clip = txt_clip.set_start(caption.startTime)
            txt_clip = txt_clip.set_duration(caption.endTime - caption.startTime)

            # Apply animation - but only if it's not 'none' or 'fade'
            # The frontend preview doesn't show animations, so we should match that
            # by not applying fade animations that create unexpected dissolve effects
            animation_type = caption.style.animation
            if animation_type and animation_type not in ('none', 'fade'):
                txt_clip = apply_animation(txt_clip, animation_type)
                print(f"  Applied animation: {animation_type}")
            else:
                print(f"  No animation applied (type: {animation_type})")

            text_clips.append(txt_clip)
            print(f"  ✓ Successfully created caption for '{caption.word}'")
        except Exception as e:
            print(f"Error creating text clip for word '{caption.word}': {e}")
            import traceback
            traceback.print_exc()
            continue

    # Composite video with all text clips
    print(f"\n" + "="*60)
    print(f"RENDER SUMMARY")
    print(f"="*60)
    print(f"Total captions received: {len(captions)}")
    print(f"Unique captions processed: {len(processed_ids)}")
    print(f"Text clips created: {len(text_clips)}")
    
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
