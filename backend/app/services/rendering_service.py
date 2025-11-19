from moviepy.editor import VideoFileClip, TextClip, CompositeVideoClip
from moviepy.config import change_settings
from typing import List
import os
from pathlib import Path
import glob
from app.models.caption_models import Caption

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

            # Get font and ensure it's never None
            font_family = map_font_family(caption.style.fontFamily)
            if not font_family:
                font_family = "Arial"  # Extra safety

            # Calculate max width for text wrapping (80% of video width)
            max_text_width = int(video.w * 0.8)

            # Create text clip with word wrapping support
            txt_clip = TextClip(
                caption.word,
                fontsize=actual_font_size,
                font=font_family,
                color=caption.style.color,
                stroke_color=caption.style.strokeColor if caption.style.strokeColor else None,
                stroke_width=int(caption.style.strokeWidth * min(scale_x, scale_y)) if caption.style.strokeWidth else 0,
                method='caption',  # Use 'caption' method for word wrapping
                size=(max_text_width, None),  # Set max width, auto height
                bg_color=caption.style.backgroundColor if caption.style.backgroundColor else None,
            )

            # Position
            txt_clip = txt_clip.set_position((actual_x, actual_y))

            # Set timing
            txt_clip = txt_clip.set_start(caption.startTime)
            txt_clip = txt_clip.set_duration(caption.endTime - caption.startTime)

            # Apply animation
            txt_clip = apply_animation(txt_clip, caption.style.animation)

            text_clips.append(txt_clip)
        except Exception as e:
            print(f"Error creating text clip for word '{caption.word}': {e}")
            import traceback
            traceback.print_exc()
            continue

    # Composite video with all text clips
    if text_clips:
        final_video = CompositeVideoClip([video] + text_clips)
    else:
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


def map_font_family(font_family) -> str:
    """Map web fonts to system fonts"""
    # Handle None or empty font family
    if not font_family:
        print(f"⚠ Warning: font_family is None or empty, defaulting to Arial")
        return "Arial"

    font_map = {
        # Original templates
        "Impact, sans-serif": "Impact",
        "Montserrat, sans-serif": "Arial-Bold",
        "Bebas Neue, sans-serif": "Arial-Black",
        "Caveat, cursive": "Comic-Sans-MS",
        # Additional system fonts
        "Arial, sans-serif": "Arial",
        "Helvetica, sans-serif": "Helvetica",
        "Times New Roman, serif": "Times-New-Roman",
        "Georgia, serif": "Georgia",
        "Courier New, monospace": "Courier-New",
        "Verdana, sans-serif": "Verdana",
        "Comic Sans MS, cursive": "Comic-Sans-MS",
    }

    # If exact match exists, use it
    if font_family in font_map:
        mapped_font = font_map[font_family]
        print(f"  Font mapping: '{font_family}' -> '{mapped_font}'")
        return mapped_font

    # Otherwise, try to extract just the font name (for custom fonts)
    # e.g., "MyFont, sans-serif" -> "MyFont"
    font_name = font_family.split(',')[0].strip()

    # Remove quotes if present
    font_name = font_name.strip('"').strip("'")

    # Replace spaces with hyphens for system fonts
    font_name_safe = font_name.replace(' ', '-')

    print(f"  Font mapping (custom): '{font_family}' -> '{font_name_safe}'")
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
