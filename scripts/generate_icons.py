import os
from PIL import Image

def generate_icons(source_image_path, android_res_path):
    if not os.path.exists(source_image_path):
        print(f"Error: Source image not found at {source_image_path}")
        return

    # Standard Android icon sizes (for legacy ic_launcher.png and ic_launcher_round.png)
    legacy_sizes = {
        'mipmap-mdpi': 48,
        'mipmap-hdpi': 72,
        'mipmap-xhdpi': 96,
        'mipmap-xxhdpi': 144,
        'mipmap-xxxhdpi': 192,
    }

    # Adaptive icon foreground sizes (base 108dp)
    # 1 dp = 1 px @ mdpi
    adaptive_sizes = {
        'mipmap-mdpi': 108,
        'mipmap-hdpi': 162,
        'mipmap-xhdpi': 216,
        'mipmap-xxhdpi': 324,
        'mipmap-xxxhdpi': 432,
    }

    try:
        img = Image.open(source_image_path)
        print(f"Loaded image: {source_image_path}, size: {img.size}")

        # Generate Legacy Icons
        for folder_name, size in legacy_sizes.items():
            target_folder = os.path.join(android_res_path, folder_name)
            if not os.path.exists(target_folder):
                os.makedirs(target_folder)
            
            # Resize
            resized_img = img.resize((size, size), Image.Resampling.LANCZOS)
            
            # Save legacy
            target_path_launcher = os.path.join(target_folder, 'ic_launcher.png')
            resized_img.save(target_path_launcher, 'PNG')
            
            target_path_round = os.path.join(target_folder, 'ic_launcher_round.png')
            resized_img.save(target_path_round, 'PNG')
            
            print(f"Saved legacy icons for {folder_name} ({size}x{size})")

        # Generate Adaptive Foreground Icons
        for folder_name, size in adaptive_sizes.items():
            target_folder = os.path.join(android_res_path, folder_name)
            if not os.path.exists(target_folder):
                os.makedirs(target_folder)
            
            # Resize
            resized_img = img.resize((size, size), Image.Resampling.LANCZOS)
            
            # Save foreground
            target_path_foreground = os.path.join(target_folder, 'ic_launcher_foreground.png')
            resized_img.save(target_path_foreground, 'PNG')
            
            print(f"Saved adaptive foreground icon for {folder_name} ({size}x{size})")


    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    source = r'c:\Users\emre\.gemini\antigravity\scratch\ESOCAD\app-icon.png'
    res_dir = r'c:\Users\emre\.gemini\antigravity\scratch\ESOCAD\android\app\src\main\res'
    generate_icons(source, res_dir)
