# DeckScribe

## Script Commands

### `icon(key, imagePath)`

Defines an icon to be used with `icons`.

`key` - A string key for this icon (must be unique among all icons).
`imagePath` - The path to the image file.

### `icons(keyStr, x, y, height, spacing = 0)`

Draws a sequence of icons which have been defined by `icon`.

`keyStr` - A comma-separated sequence of icon keys. Must only contain the keys and commas, no spaces.
`x` - X-coordinate.
`y` - Y-coordinate.
`height` - The height of the drawn icons.
`spacing` - (optional) Length of the gap between the icons.

### `iconsTest(keyStr, height, spacing = 0)`

Determines the span length of a sequence of icons drawn by `icons`.

`keyStr` - A comma-separated sequence of icon keys. Must only contain the keys and commas, no spaces.
`height` - The height of the drawn icons.
`spacing` - (optional) Length of the gap between the icons.

### `text(text, x, y, width, height, fontname = null, extraStyle = '')`

Draws text.

`text` - The text string to draw.
`x` - X-coordinate.
`y` - Y-coordinate.
`width` - The width of the block of text. Text will wrap to fit this width.
`height` - The height of the block of text. Text that exceeds this height will be cut off.
`fontname` - (optional) The name of a font defined by `textfont`.
`extraStyle` - (optional) Extra CSS styling.

### `style(styleText)`

Defines global CSS styles.

`styleText` - The CSS style.

### `textfont(fontname, fontFamily, fontSize, extra = null)`

Defines a font to be used by `text`.

`fontname` - The name of the font which will be passed to `text`'s `fontname` parameter.
`fontFamily` - The font family to use, usually just the name of the font.
`fontSize` - The font size in pt.
`extra` - (optional) Extra style parameters in the form of an object with the following fields:
    `color` - The color of the text.
    `lineHeight` - Line height.
    `marginTop` - Top margin.
    `textAlign` - Alignment (`'left'`, `'right'`, `'center'`).
    `outline` - An array of the form `[size, color]`, where `size` is the thickness of the outline, and `color` is the color.

### `textimage(token, imagePath, heightRatio = 1)`

Defines an image which will replace the given `token` text in all `text` draws.

`token` - The text to search for and replace with the image.
`imagePath` - The path of the image file.
`heightRatio` - The height of the image expressed as a factor of the font's line height.

### `image(imagePath, x, y, width, height, extra)`

Draws an image.

`imagePath` - The file name of the image.
`x` - X-coordinate.
`y` - Y-coordinate.
`width` - The width of the drawn image.
`height` - The height of the drawn image.
`extra` - (optional) Extra parameters:
    `preserveAspectRatio` - SVG parameter (see [https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/preserveAspectRatio](https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/preserveAspectRatio)).

### `rect(x, y, width, height, extra = { fill: 'none', stroke: 'none', strokeWidth: 1 / deck.cardDPI })`

Draws a rectangle.

`x` - X-coordinate.
`y` - Y-coordinate.
`width` - The width of the drawn rectangle.
`height` - The height of the drawn rectangle.
`extra` - (optional) Extra parameters:
    `fill` - The fill pattern of the rectangle.
    `stroke` - The stroke pattern of the rectangle`.
    `strokeWidth` - The width of the stroke.

### `json(fileFullPath)`

Loads and returns data from a json file as an object.

`fileFullPath` - The path of the json file.

### `gradient(x1, y1, x2, y2, stops)`

Defines and returns a gradient url, typically used with `rect`'s `fill` parameter.

Follows the same general syntax of SVG `<linearGradient>` elements.

`x1` - Starting X-coordinate of the gradient.
`y1` - Starting Y-coordinate of the gradient.
`x2` - Ending X-coordinate of the gradient.
`y2` - Ending Y-coordinate of the gradient.
`stops` - An array of gradient stops, where each stop is an array in the form `[where, color]`.
