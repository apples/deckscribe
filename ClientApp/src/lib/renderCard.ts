import { DeckData, DeckFile, DeckFileImage } from "../store/collabSlice";

const xmlns = 'http://www.w3.org/2000/svg';

interface Whiteboard {
    svg: SVGSVGElement;
    defs: SVGDefsElement;
    nextId: number;
    icons: { [name: string]: { image: DeckFileImage } };
    textimages: {
        [token: string]: {
            token: string,
            image: DeckFileImage,
            heightRatio: number,
            extra?: { imageRendering?: string },
        },
    };
}

function resetDimensions(canvas: HTMLCanvasElement, deck: DeckData) {
    canvas.width = Math.ceil(deck.cardDPI * deck.cardWidth);
    canvas.height = Math.ceil(deck.cardDPI * deck.cardHeight);

    const widthRatio = canvas.width / canvas.height;

    const canvasHeight = '800px';

    canvas.style.height = canvasHeight;
    canvas.style.width = `calc(${canvasHeight} * ${widthRatio})`;
}

function createWhiteboard(canvas: HTMLCanvasElement): Whiteboard {
    const svg = document.createElementNS(xmlns, 'svg');
    svg.setAttribute('viewBox', `0 0 ${canvas.width} ${canvas.height}`);
    svg.setAttribute('width', canvas.width + 'px');
    svg.setAttribute('height', canvas.height + 'px');

    const defs = document.createElementNS(xmlns, 'defs');
    svg.appendChild(defs);

    return {
        svg: svg,
        defs: defs,
        nextId: 1,
        icons: {},
        textimages: {},
    };
}

export function renderCard(canvas: HTMLCanvasElement, deck: DeckData, csvData: any, cardIndex: number): Promise<void> {
    return new Promise((resolve, reject) => {
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            throw new Error('Could not get canvas context');
        }

        resetDimensions(canvas, deck);

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const whiteboard = createWhiteboard(canvas);

        const lastCard = csvData.length - 1;

        if (cardIndex < 1) {
            cardIndex = 1;
        }

        if (cardIndex > lastCard) {
            cardIndex = lastCard;
        }

        const field: { [key: string]: any } = {};

        for (let i = 0; i < csvData[0].length; i++) {
            field[csvData[0][i]] = csvData[cardIndex][i];
        }

        const commands = makeCommands(deck, whiteboard);

        commands.style(`
            image, img {
                image-rendering: pixelated;
            }
        `);

        (function () {
            const icon = commands.icon;
            const icons = commands.icons;
            const iconsTest = commands.iconsTest;
            const text = commands.text;
            const style = commands.style;
            const textfont = commands.textfont;
            const textimage = commands.textimage;
            const rect = commands.rect;
            const image = commands.image;
            const json = commands.json;
            const gradient = commands.gradient;

            eval(deck.scriptText);
        })();

        const svgStr = new XMLSerializer().serializeToString(whiteboard.svg);

        console.log(svgStr);

        const img = new Image();
        img.decoding = 'sync';
        img.onload = (ev) => {
            ctx.drawImage(img, 0, 0);
            resolve();
        };
        img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(svgStr);
    });
}

function getFile(deck: DeckData, fullPath: string): DeckFile {
    let file = deck.files[fullPath];
    if (!file) {
        console.warn(`File ${fullPath} not found.`);
    }
    return file;
}

function getImage(deck: DeckData, fileName: string): DeckFileImage {
    let file = getFile(deck, deck.imagePrefix + fileName);
    if (!file) return file;
    if (file.type !== 'image') {
        throw new Error(`File ${fileName} is not an image.`);
    }
    return file;
}

function escapeRegex(str: string) {
    return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

const makeCommands = (deck: DeckData, whiteboard: Whiteboard) => ({
    icon(key: string, imagePath: string) {
        const image = getImage(deck, imagePath);
        if (!image) {
            console.warn(`Image ${imagePath} not found.`);
        }
        if (image) {
            whiteboard.icons[key] = {
                image: image,
            };
        }
    },
    icons(keyStr: string, x: number, y: number, height: number, spacing: number = 0) {
        x *= deck.cardDPI;
        y *= deck.cardDPI;
        height *= deck.cardDPI;
        spacing *= deck.cardDPI;

        if (!keyStr || keyStr === '') {
            return;
        }

        let keys = keyStr.split(',');
        for (let i = 0; i < keys.length; i++) {
            if (!whiteboard.icons[keys[i]]) {
                console.warn(`Icon '${keys[i]}' not found`);
                continue;
            }

            let svgImage = document.createElementNS(xmlns, 'image');
            let image = whiteboard.icons[keys[i]].image;
            let width = image.width * height / image.height;

            svgImage.setAttribute('href', image.url);
            svgImage.setAttribute('x', x.toString());
            svgImage.setAttribute('y', y.toString());
            svgImage.setAttribute('height', height.toString());
            svgImage.setAttribute('width', width.toString());
            whiteboard.svg.appendChild(svgImage);

            x += width + spacing;
        }
    },
    iconsTest(keyStr: string, height: number, spacing: number = 0) {
        height *= deck.cardDPI;
        spacing *= deck.cardDPI;

        let x = 0;

        const result = {
            width: 0,
            height: height,
            keys: null as string[] | null,
        };

        if (!keyStr || keyStr === '') {
            return result;
        }

        let keys = keyStr.split(',');
        result.keys = keys;

        for (let i = 0; i < keys.length; i++) {
            if (!whiteboard.icons[keys[i]]) {
                console.warn(`Icon '${keys[i]}' not found`);
                continue;
            }

            let image = whiteboard.icons[keys[i]].image;
            let width = image.width * height / image.height;

            x += width + spacing;
        }

        result.width = (x - spacing) / deck.cardDPI;

        return result;
    },
    text(text: string, x: number, y: number, width: number, height: number, fontname?: string, extraStyle: string = '') {
        text = text && String(text);
        x *= deck.cardDPI;
        y *= deck.cardDPI;
        width *= deck.cardDPI;
        height *= deck.cardDPI;

        if (!text || text === '') {
            return;
        }

        let div = document.createElementNS('http://www.w3.org/1999/xhtml', 'div');
        div.className = `text ${fontname ? 'font-' + fontname : ''}`;
        div.setAttribute('style', `position:absolute; width:${width}px; height:${height}px; ${extraStyle}`);

        // build strings

        if (Object.keys(whiteboard.textimages).length > 0) {
            const tokens = Object.values(whiteboard.textimages).map(x => escapeRegex(x.token));
            const regex = new RegExp(`(${tokens.join('|')})`, '');

            let currentIconSpan = null;

            let match = null;
            let c = 0;
            while ((match = regex.exec(text)) !== null) {
                ++c;
                if (c > 10) break;
                if (match.index > 0) {
                    let textEle = document.createTextNode(text.substring(0, match.index));
                    div.appendChild(textEle);
                    currentIconSpan = null;
                }

                const textimage = whiteboard.textimages[match[1]];

                let imgEle = document.createElementNS('http://www.w3.org/1999/xhtml', 'img');
                imgEle.setAttribute('src', textimage.image.url);
                imgEle.setAttribute('style', `
                    height: calc(1em * ${textimage.heightRatio});
                    ${textimage.extra?.imageRendering ? `image-rendering: ${textimage.extra.imageRendering};` : ''}
                `);

                if (currentIconSpan == null) {
                    currentIconSpan = document.createElementNS('http://www.w3.org/1999/xhtml', 'span');
                    currentIconSpan.setAttribute('style', 'white-space: nowrap;');
                    currentIconSpan.appendChild(document.createTextNode('⁠'));
                    div.appendChild(currentIconSpan);
                }

                currentIconSpan.appendChild(imgEle);

                text = text.substring(match.index + match[0].length);
            }
        }

        if (text.length > 0) {
            let textEle = document.createTextNode(text);
            div.appendChild(textEle);
        }

        // render

        let obj = document.createElementNS(xmlns, 'foreignObject');
        obj.setAttribute('x', x.toString());
        obj.setAttribute('y', y.toString());
        obj.setAttribute('width', width.toString());
        obj.setAttribute('height', height.toString());
        obj.appendChild(div);
        whiteboard.svg.appendChild(obj);
    },
    style(styleText: string) {
        let style = document.createElementNS(xmlns, 'style');
        style.textContent = styleText;
        whiteboard.svg.appendChild(style);
    },
    textfont(fontname: string, fontFamily: string, fontSize: number, extra?: {
        color?: string, lineHeight?: number, marginTop?: number, textAlign?: string, outline?: [number, string]
    }) {
        fontSize *= deck.cardDPI / 72.0;

        const outlineText = (outline: [number, string]) => {
            const size = outline[0];
            const color = outline[1];

            return `
                text-shadow:
                    -${size} -${size} 0 ${color},
                    0 -${size} 0 ${color},
                    ${size} -${size} 0 ${color},
                    -${size} 0 0 ${color},
                    ${size} 0 0 ${color},
                    -${size} ${size} 0 ${color},
                    0 ${size} 0 ${color},
                    ${size} ${size} 0 ${color};
            `;
        }

        let style = document.createElementNS(xmlns, 'style');
        style.textContent = `
                .text.font-${fontname} {
                    font-family: ${fontFamily};
                    font-size: ${fontSize}px;
                    overflow: visible;
                    ${extra?.color ? `color: ${extra.color};` : 'color: black;'}
                    ${extra?.lineHeight ? `line-height: ${extra.lineHeight * deck.cardDPI / 72}px;` : ''}
                    ${extra?.marginTop ? `margin-top: ${extra.marginTop * deck.cardDPI / 72}px;` : ''}
                    ${extra?.textAlign ? `text-align: ${extra.textAlign};` : ''}
                    ${extra?.outline ? outlineText(extra.outline) : ''}
                }
            `;
        whiteboard.svg.appendChild(style);
    },
    textimage(token: string, imagePath: string, heightRatio: number = 1, extra?: { imageRendering?: string}) {
        const image = getImage(deck, imagePath);
        if (!image) {
            console.warn(`Image '${imagePath}' not found`);
            return;
        }
        whiteboard.textimages[token] = {
            token,
            image,
            heightRatio,
            extra,
        };
    },
    image(imagePath: string, x: number, y: number, width: number, height: number, extra?: { preserveAspectRatio?: string }) {
        x *= deck.cardDPI;
        y *= deck.cardDPI;
        width *= deck.cardDPI;
        height *= deck.cardDPI;

        let svgImage = document.createElementNS(xmlns, 'image');
        let image = getImage(deck, imagePath);

        if (!image) {
            return;
        }

        svgImage.setAttribute('href', image.url);
        svgImage.setAttribute('x', x.toString());
        svgImage.setAttribute('y', y.toString());
        svgImage.setAttribute('height', height.toString());
        svgImage.setAttribute('width', width.toString());

        if (extra?.preserveAspectRatio != null) {
            svgImage.setAttribute('preserveAspectRatio', extra.preserveAspectRatio);
        }

        whiteboard.svg.appendChild(svgImage);
    },
    rect(x: number, y: number, width: number, height: number, extra?: { fill: string, stroke: string, strokeWidth: number }) {
        
        const { fill = 'none', stroke = 'none' } = extra ?? { };
        let { strokeWidth = 1 / deck.cardDPI } = extra ?? { };

        x *= deck.cardDPI;
        y *= deck.cardDPI;
        width *= deck.cardDPI;
        height *= deck.cardDPI;
        strokeWidth *= deck.cardDPI;

        let rect = document.createElementNS(xmlns, 'rect');
        rect.setAttribute('x', x.toString());
        rect.setAttribute('y', y.toString());
        rect.setAttribute('width', width.toString());
        rect.setAttribute('height', height.toString());
        rect.setAttribute('fill', fill);
        rect.setAttribute('stroke', stroke);
        rect.setAttribute('stroke-width', strokeWidth.toString());
        whiteboard.svg.appendChild(rect);
    },
    json(fileFullPath: string) {
        const file = getFile(deck, fileFullPath);
        if (!file) {
            return null;
        }
        if (file.type !== 'text') {
            console.error(`File ${fileFullPath} is not a text file.`);
            return null;
        }
        const json = JSON.parse(file.contents);
        return json;
    },
    gradient(x1: number, y1: number, x2: number, y2: number, stops: [number, string][]) {
        const gradient = document.createElementNS(xmlns, 'linearGradient');

        const id = `gradient-${whiteboard.nextId}`;
        gradient.setAttribute('id', id);
        ++whiteboard.nextId;

        gradient.setAttribute('x1', x1.toString());
        gradient.setAttribute('y1', y1.toString());
        gradient.setAttribute('x2', x2.toString());
        gradient.setAttribute('y2', y2.toString());

        for (const [offset, color] of stops) {
            const stopEle = document.createElementNS(xmlns, 'stop');
            stopEle.setAttribute('offset', offset.toString());
            stopEle.setAttribute('stop-color', color);
            gradient.appendChild(stopEle);
        }

        whiteboard.defs.appendChild(gradient);
        return `url(#${id})`;
    },
});
