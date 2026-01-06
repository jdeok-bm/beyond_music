import streamlit as st
import pandas as pd

st.set_page_config(page_title="BeyondMusic Library", layout="wide")

st.markdown("""
    <style>
    .music-card {
        display: flex;
        align-items: center;
        background-color: #111;
        color: white;
        border-radius: 16px;
        padding: 16px;
        margin-bottom: 16px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
    }
    .music-thumbnail {
        flex-shrink: 0;
        width: 120px;
        height: 120px;
        border-radius: 12px;
        object-fit: cover;
        margin-right: 20px;
    }
    .music-info {
        flex-grow: 1;
    }
    .music-title {
        font-size: 1.3em;
        font-weight: 600;
        margin-bottom: 6px;
    }
    .music-artist {
        color: #f9d342;
        margin-bottom: 6px;
    }
    .music-meta {
        color: #ccc;
        font-size: 0.9em;
    }
    </style>
""", unsafe_allow_html=True)

st.title("BeyondMusic Library Demo")
st.markdown("> 메뉴판 (csv 파일) 에 저장된 곡들을 카드형 UI로 구성")

# CSV 파일 불러오기
csv_path = "music_list.csv"
try:
    df = pd.read_csv(csv_path)
except FileNotFoundError:
    st.error("⚠️ CSV 파일을 찾을 수 없습니다.")
    st.stop()

for _, row in df.iterrows():
    with st.container():
        st.markdown(f"""
            <div class="music-card">
                <img src="{row['thumbnail']}" class="music-thumbnail">
                <div class="music-info">
                    <div class="music-title">{row['title']}</div>
                    <div class="music-artist">{row['artist']}</div>
                    <div class="music-meta">Mood: {row['mood']} | Genre: {row['genre']}</div>
                </div>
            </div>
        """, unsafe_allow_html=True)
        
        # 유튜브 임베드
        youtube_id = row["url"].split("v=")[-1]
        embed_url = f"https://www.youtube.com/embed/{youtube_id}"
        st.markdown(f'<iframe width="100%" height="250" src="{embed_url}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>', unsafe_allow_html=True)

        st.markdown("---")
