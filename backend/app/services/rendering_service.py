from moviepy.editor import VideoFileClip, TextClip, CompositeVideoClip
from typing import List
import os
from pathlib import Path
from app.models.caption_models import Caption

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

            # Create text clip
            txt_clip = TextClip(
                caption.word,
                fontsize=actual_font_size,
                font=map_font_family(caption.style.fontFamily),
                color=caption.style.color,
                stroke_color=caption.style.strokeColor if caption.style.strokeColor else None,
                stroke_width=int(caption.style.strokeWidth * min(scale_x, scale_y)) if caption.style.strokeWidth else 0,
                method='label',
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


def map_font_family(font_family: str) -> str:
    """Map web fonts to system fonts"""
    font_map = {
        "Impact, sans-serif": "Impact",
        "Montserrat, sans-serif": "Arial-Bold",
        "Bebas Neue, sans-serif": "Arial-Black",
        "Caveat, cursive": "Comic-Sans-MS",
    }
    return font_map.get(font_family, "Arial")


def apply_animation(clip, animation_type: str):
    """Apply animation to text clip"""

    if animation_type == "fade":
        return clip.crossfadein(0.2).crossfadeout(0.2)

    elif animation_type == "pop":
        # Scale from 0 to 1
        return clip.resize(lambda t: min(1, t * 5))

    elif animation_type == "slide_up":
        # Slide from bottom
        def pos_func(t):
            return (clip.pos[0], clip.pos[1] - t * 50)
        return clip.set_position(pos_func)

    elif animation_type == "bounce":
        # Bounce effect
        import numpy as np
        def bounce(t):
            return 1 + abs(np.sin(t * 10)) * 0.2
        return clip.resize(bounce)

    else:
        return clip
