# 背景画像 AI生成プロンプト

NanoBanana / Stable Diffusion 用。生成後 webp に変換して `public/bg/bg-{0-6}.webp` に配置。
推奨サイズ: 1920x1080 以上、暗め、文字が読めないボケ。

## Sunday (bg-0) — 雨上がりの港町、ネオンが水面に反射

```
nighttime harbor port district after rain, wet cobblestone streets reflecting neon pink and cyan blue lights, distant cargo ships silhouettes, blurry out-of-focus glowing signs with unreadable text, shallow depth of field bokeh, puddles reflecting electric pink and teal neon, dark moody atmosphere, cinematic photography, low angle shot, fog rolling over calm water, color palette deep navy black sky with accents of hot pink and ice blue neon glow, photorealistic, 35mm film grain, f1.4 aperture bokeh
```

## Monday (bg-1) — 狭い路地裏の居酒屋横丁、提灯のボケ

```
narrow Japanese izakaya alley at night, tight back street lined with small bars and pubs, rows of blurry defocused paper lanterns and neon signs with illegible kanji text, strong bokeh circles of pink and cyan light, steam rising from kitchen vents, wet pavement reflecting warm and cool neon tones, shallow depth of field, dark shadowy atmosphere, cinematic color grading, deep blacks with hot pink and electric blue accent lighting, photorealistic street photography style, 50mm lens wide open, moody film noir aesthetic
```

## Tuesday (bg-2) — ネオン街を見下ろす夜空と雲

```
dramatic night sky with layered clouds illuminated from below by distant neon city glow, looking upward between dark building silhouettes, clouds tinted magenta pink and electric cyan from urban light pollution, a few visible stars, blurry unfocused neon signs at edges of frame with unreadable text, deep dark indigo sky fading to near black, atmospheric perspective, cinematic wide angle shot, moody ethereal nightscape, color palette dominated by deep darkness with streaks of neon pink and blue cloud illumination, photorealistic, long exposure feel
```

## Wednesday (bg-3) — 雨の夜のバー街、ガラスに滲むネオン

```
rainy night bar district seen through rain-streaked glass window, heavy raindrops distorting neon signs into abstract streaks of hot pink and cyan blue, blurry unreadable illuminated text signs behind wet glass, dark interior foreground, water droplets on glass surface catching colored light, bokeh circles from distant streetlights, melancholic atmospheric mood, cinematic shallow depth of field, deep black shadows with vibrant neon color bleeding through rain, photorealistic macro photography style, anamorphic lens flare streaks
```

## Thursday (bg-4) — 運河沿いのネオン酒場、水面の光

```
nighttime canal waterway lined with small neon-lit bars and drinking establishments, calm dark water surface reflecting elongated streaks of neon pink and electric blue light, small wooden boats moored along the canal edge, blurry defocused signage with unreadable glowing text in background, bridge silhouette in distance, atmospheric haze and mist over water, cinematic photography composition, deep rich blacks with vivid pink and teal neon reflections, moody contemplative atmosphere, 85mm lens bokeh, film grain texture, low key lighting
```

## Friday (bg-5) — 高架下の飲み屋街、列車の光跡

```
under-the-overpass drinking district at night, concrete railway viaduct overhead with light trails from passing train as motion blur, rows of tiny bars with glowing blurry neon signs showing unreadable text, strong bokeh orbs of magenta pink and ice blue, electrical cables and pipes along ceiling, steam and warm light spilling from doorways, gritty urban atmosphere, dark moody cinematic photography, deep shadows and selective neon illumination in pink and cyan tones, photorealistic, wide angle 24mm lens, dystopian cyberpunk undertones, industrial noir aesthetic
```

## Saturday (bg-6) — 屋上から見下ろすネオン街の海、遠景ボケ

```
rooftop view looking down over vast nighttime entertainment district stretching toward distant ocean horizon, sea of blurry unfocused neon signs creating abstract carpet of pink and blue light dots, tilt-shift miniature effect making buildings look like tiny models, dark sky with thin clouds reflecting city glow, distant harbor lights on horizon line, all text and signage completely defocused into soft bokeh orbs, atmospheric aerial perspective with haze layers, cinematic establishing shot, color palette deep black with fields of hot pink and electric cyan neon bokeh, photorealistic night cityscape, dreamy ethereal mood
```

## 使い方

1. 上記プロンプトで画像生成（NanoBanana等）
2. 暗くてボケが強いものを選ぶ（文字が読めないこと）
3. webp に変換（`cwebp -q 80 input.png -o bg-X.webp`）
4. `public/bg/bg-0.webp` 〜 `bg-6.webp` に配置
5. `git push` でデプロイ
