from moviepy import VideoFileClip

# arquivo de entrada
input_video = "t-29-06-2022-n16-03.MOV"

# arquivo de saída
output_video = "video.mp4"

# carregando vídeo
video = VideoFileClip(input_video)

# convertendo para mp4
video.write_videofile(
    output_video,
    codec="libx264",
    audio_codec="aac"
)

print("Conversão concluída!")