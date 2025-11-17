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

    # Create text clips for each caption
    text_clips = []

    for caption in captions:
        try:
            # Create text clip
            txt_clip = TextClip(
                caption.word,
                fontsize=caption.style.fontSize,
                font=map_font_family(caption.style.fontFamily),
                color=caption.style.color,
                stroke_color=caption.style.strokeColor if caption.style.strokeColor else None,
                stroke_width=caption.style.strokeWidth,
                method='caption',
                size=(video.w, None)
            )

            # Position
            txt_clip = txt_clip.set_position((caption.position.x, caption.position.y))

            # Set timing
            txt_clip = txt_clip.set_start(caption.startTime)
            txt_clip = txt_clip.set_end(caption.endTime)

            # Apply animation
            txt_clip = apply_animation(txt_clip, caption.style.animation)

            text_clips.append(txt_clip)
        except Exception as e:
            print(f"Error creating text clip for word '{caption.word}': {e}")
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
