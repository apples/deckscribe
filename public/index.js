(function () {
    let canvasHeight = '800px';

    let canvas;
    let ctx;
    let editor;
    let renderButton;
    let renderAllButton;
    let uploadbox;
    let datafilepath;
    let cardindex;
    let dpiinput;
    let ttsFilenamePrefix;

    let whiteboard;

    let deck = {
        cardDPI: 300,
        cardWidth: 2.5,
        cardHeight: 3.5,
        scriptText: '',
        imagePrefix: '/',
        files: {},
        dataFilePath: '',
    };

    let saveTimeout;

    const xmlns = 'http://www.w3.org/2000/svg';

    const tts_template_url = 'tts-template.json';
    const tts_card_template_url = 'tts-card-template.json';

    async function main() {
        require.config({ paths: { vs: 'https://unpkg.com/monaco-editor@0.34.0/min/vs' } });
        await new Promise((resolve, reject) => {
            require(['vs/editor/editor.main'], () => {
                resolve();
            });
        });

        editor = monaco.editor.create(document.getElementById('monaco-container'), {
            value: '',
            language: 'javascript',
            theme: 'vs-dark',
        });

        const savedData = localStorage.getItem('deckData');
        if (savedData) {
            deck = JSON.parse(savedData);
        }
        listFiles();

        canvas = document.getElementById('canvas');
        ctx = canvas.getContext('2d');
        resetDimensions();
        
        editor.getModel().setValue(deck.scriptText);
        editor.getModel().onDidChangeContent(() => {
            deck.scriptText = editor.getModel().getValue();
            saveDeckData();
        });

        renderButton = document.getElementById('render-button');
        renderButton.addEventListener('click', () => {
            render();
        });

        renderAllButton = document.getElementById('render-all-button');
        renderAllButton.addEventListener('click', async () => {
            renderAllButton.disabled = true;

            try {
                const dataFile = deck.files[deck.dataFilePath];
                if (!dataFile || dataFile.type !== 'text') {
                    console.warn(`Data file not found: ${deck.dataFilePath}`);
                    return;
                }
                const data = csv_parse_sync.parse(dataFile.contents);

                var basename = deck.dataFilePath.replace(/^\/*/, '').replace('/', '-').replace(/\.csv$/, '');

                const tts_card_template = await (await fetch(tts_card_template_url)).text();
                const tts_object = JSON.parse(await (await fetch(tts_template_url)).text());
                const deck_object = tts_object.ObjectStates[0];

                var zip = new JSZip();

                for (let i = 1; i < data.length; i++) {
                    cardindex.value = i;
                    await render(data, i);
                    const img = canvas.toDataURL('image/png', 1);

                    const filename = `${basename}-${i}.png`;
                    zip.file(filename, img.split('base64,')[1], { base64: true });

                    const card = JSON.parse(tts_card_template);

                    const custom_deck = card.CustomDeck[1];
                    delete card.CustomDeck[1];
                    card.CustomDeck[i] = custom_deck;

                    custom_deck.FaceURL = `${ttsFilenamePrefix.value}${filename}`;
                    custom_deck.BackURL = `${ttsFilenamePrefix.value}${basename}-back.png`;

                    card.CardID = i * 100;

                    deck_object.DeckIDs.push(card.CardID);
                    deck_object.CustomDeck[i] = custom_deck;
                    deck_object.ContainedObjects.push(card);
                }

                zip.file(`${basename}-cards.json`, JSON.stringify(tts_object) + '\n');

                let blob = await zip.generateAsync({ type: 'blob' });
                saveAs(blob, `${basename}.zip`);
            } finally {
                renderAllButton.disabled = false;
            }
        });

        datafilepath = document.getElementById('datafilepath');
        datafilepath.value = deck.dataFilePath ?? '';
        datafilepath.addEventListener('change', (ev) => {
            deck.dataFilePath = datafilepath.value;
            saveDeckData(true);
            render();
        });

        cardindex = document.getElementById('cardindex');
        cardindex.value = 1;
        cardindex.addEventListener('change', (ev) => {
            if (cardindex.value < 1) {
                cardindex.value = 1;
            }
            render();
        });

        dpiinput = document.getElementById('dpiinput');
        dpiinput.value = deck.cardDPI;
        dpiinput.addEventListener('change', (ev) => {
            deck.cardDPI = dpiinput.value;
            saveDeckData(true);
            resetDimensions();
            render();
        });

        ttsFilenamePrefix = document.getElementById('tts-filename-prefix');
        ttsFilenamePrefix.value = deck.ttsFilenamePrefix || '';
        ttsFilenamePrefix.addEventListener('change', (ev) => {
            deck.ttsFilenamePrefix = ttsFilenamePrefix.value;
            saveDeckData(true);
        });

        uploadbox = document.getElementById('uploadbox');
        uploadbox.addEventListener('dragenter', (ev) => { ev.preventDefault(); });
        uploadbox.addEventListener('dragover', (ev) => { ev.preventDefault(); });
        uploadbox.addEventListener('drop', (ev) => {
            ev.preventDefault();

            uploadbox.querySelector('.loader').style.visibility = 'visible';

            const addFile = (entry) => {
                return new Promise((resolve, reject) => {
                    entry.file((file) => {
                        let reader = new FileReader();
                        if (entry.fullPath.endsWith('.png')) {
                            reader.readAsDataURL(file);
                            reader.onload = () => {
                                let imgurl = URL.createObjectURL(file);
                                let img = document.createElement('img');
                                img.addEventListener('load', (ev) => {
                                    deck.files[entry.fullPath] = {
                                        fullPath: entry.fullPath,
                                        type: 'image',
                                        url: reader.result,
                                        width: img.naturalWidth,
                                        height: img.naturalHeight,
                                    };
                                    console.log(`Loaded image file ${entry.fullPath}`, deck.files[entry.fullPath]);
                                    resolve();
                                });
                                img.src = imgurl;
                            };
                        } else if (/\.(csv|txt|json)$/.test(entry.fullPath)) {
                            reader.readAsText(file);
                            reader.onload = () => {
                                deck.files[entry.fullPath] = {
                                    fullPath: entry.fullPath,
                                    type: 'text',
                                    contents: reader.result,
                                };
                                console.log(`Loaded CSV file ${entry.fullPath}`, deck.files[entry.fullPath]);
                                resolve();
                            }
                        } else {
                            deck.files[entry.fullPath] = {
                                fullPath: entry.fullPath,
                                type: 'unknown',
                            };
                            console.log(`Loaded unknown file ${entry.fullPath}`, deck.files[entry.fullPath]);
                            resolve();
                        }
                    });
                });
            };

            const walkTree = (entry) => {
                let promise = new Promise((resolve, reject) => {
                    if (entry.isFile) {
                        addFile(entry).then(() => { resolve(); });
                    } else if (entry.isDirectory) {
                        entry.createReader().readEntries((entries) => {
                            let promises = [];
                            for (let entry of entries) {
                                promises.push(walkTree(entry));
                            }
                            Promise.all(promises).then(() => {
                                resolve();
                            });
                        });
                    }
                });

                return promise;
            };

            const promises = [];
            for (let item of ev.dataTransfer.items) {
                let entry = item.webkitGetAsEntry();
                promises.push(walkTree(entry));
            }
            Promise.all(promises).finally(() => {
                uploadbox.querySelector('.loader').style.visibility = 'hidden';
                saveDeckData(true);
                listFiles();
            });
        });

        render();
    }

    function saveDeckData(force = false) {
        const save = () => {
            localStorage.setItem('deckData', JSON.stringify(deck));
            console.log('Saved.');
        };

        if (!force) {
            if (!saveTimeout) {
                saveTimeout = setTimeout(() => {
                    save();
                    saveTimeout = null;
                }, 3000);
            }
        } else {
            if (saveTimeout) {
                clearTimeout(saveTimeout);
                saveTimeout = null;
            }
            save();
        }
    }

    function listFiles() {
        const list = document.getElementById('filelist');
        const template = document.getElementById('file-template');
        list.innerHTML = '';
        const files = Object.values(deck.files);
        files.sort((a, b) => a.fullPath.localeCompare(b.fullPath));
        for (let file of files) {
            const item = template.content.cloneNode(true);
            item.querySelector('.filename').innerText = file.fullPath;
            if (file.type == 'image') {
                item.querySelector('.fileimage > img').src = file.url;
            }
            list.appendChild(item);
        }
    }

    function resetDimensions() {
        canvas.width = Math.ceil(deck.cardDPI * deck.cardWidth);
        canvas.height = Math.ceil(deck.cardDPI * deck.cardHeight);

        const widthRatio = canvas.width / canvas.height;

        canvas.style.height = canvasHeight;
        canvas.style.width = `calc(${canvasHeight} * ${widthRatio})`;
    }

    function beginWhiteboard() {
        const svg = document.createElementNS(xmlns, 'svg');
        svg.setAttribute('viewBox', `0 0 ${canvas.width} ${canvas.height}`);
        svg.setAttribute('width', canvas.width + 'px');
        svg.setAttribute('height', canvas.height + 'px');

        const defs = document.createElementNS(xmlns, 'defs');
        svg.appendChild(defs);

        whiteboard = {
            svg: svg,
            defs: defs,
            nextId: 1,
            icons: {},
            textimages: {},
        };
    }

    function render(data, index) {
        return new Promise((resolve, reject) => {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            beginWhiteboard();

            if (!data) {
                const dataFile = deck.files[deck.dataFilePath];
                data = dataFile?.type === 'text' ?
                    csv_parse_sync.parse(dataFile.contents) :
                    [[], []];
            }

            let cardIndex = index ?? cardindex.value;

            const lastCard = data.length - 1;

            if (cardIndex > lastCard) {
                cardIndex = lastCard;
                cardindex.value = cardIndex;
            }

            const field = {};

            for (let i = 0; i < data[0].length; i++) {
                field[data[0][i]] = data[cardIndex][i];
            }

            commands.style(`
                image, img {
                    image-rendering: pixelated;
                }
                .text img {
                    height: 1em;
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

                eval(editor.getModel().getValue());
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

    function getFile(fullPath) {
        let file = deck.files[fullPath];
        if (!file) {
            console.warn(`File ${fullPath} not found.`);
        }
        return file;
    }

    function getImage(name) {
        let file = getFile(deck.imagePrefix + name);
        if (!file) return file;
        console.assert(file.type === 'image', `File ${name} is not an image`);
        return file;
    }

    function escapeRegex(string) {
        return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    }

    const commands = {
        icon(key, imagePath) {
            whiteboard.icons[key] = {
                image: getImage(imagePath),
            };
        },
        icons(keyStr, x, y, height, spacing = 0) {
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
                svgImage.setAttribute('x', x);
                svgImage.setAttribute('y', y);
                svgImage.setAttribute('height', height);
                svgImage.setAttribute('width', width);
                whiteboard.svg.appendChild(svgImage);

                x += width + spacing;
            }
        },
        iconsTest(keyStr, height, spacing = 0) {
            height *= deck.cardDPI;
            spacing *= deck.cardDPI;

            let x = 0;

            const result = {
                width: 0,
                height: height,
                keys: null,
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
        text(text, x, y, width, height, fontname = null, extraStyle = '') {
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
                    imgEle.setAttribute('style', `height: calc(1em * ${textimage.heightRatio});`);

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
            obj.setAttribute('x', x);
            obj.setAttribute('y', y);
            obj.setAttribute('width', width);
            obj.setAttribute('height', height);
            obj.appendChild(div);
            whiteboard.svg.appendChild(obj);
        },
        style(styleText) {
            let style = document.createElementNS(xmlns, 'style');
            style.textContent = styleText;
            whiteboard.svg.appendChild(style);
        },
        textfont(fontname, fontFamily, fontSize, extra) {
            fontSize *= deck.cardDPI / 72.0;

            const outlineText = (outline) => {
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
        textimage(token, imagePath, heightRatio = 1) {
            whiteboard.textimages[token] = {
                token: token,
                image: getImage(imagePath),
                heightRatio: heightRatio,
            };
        },
        image(imagePath, x, y, width, height, extra) {
            x *= deck.cardDPI;
            y *= deck.cardDPI;
            width *= deck.cardDPI;
            height *= deck.cardDPI;

            let svgImage = document.createElementNS(xmlns, 'image');
            let image = getImage(imagePath);

            if (!image) {
                return;
            }

            svgImage.setAttribute('href', image.url);
            svgImage.setAttribute('x', x);
            svgImage.setAttribute('y', y);
            svgImage.setAttribute('height', height);
            svgImage.setAttribute('width', width);

            if (extra?.preserveAspectRatio) {
                svgImage.setAttribute('preserveAspectRatio', extra.preserveAspectRatio);
            }

            whiteboard.svg.appendChild(svgImage);
        },
        rect(x, y, width, height, { fill = 'none', stroke = 'none', strokeWidth = 1 / deck.cardDPI } = {}) {
            x *= deck.cardDPI;
            y *= deck.cardDPI;
            width *= deck.cardDPI;
            height *= deck.cardDPI;
            strokeWidth *= deck.cardDPI;

            let rect = document.createElementNS(xmlns, 'rect');
            rect.setAttribute('x', x);
            rect.setAttribute('y', y);
            rect.setAttribute('width', width);
            rect.setAttribute('height', height);
            rect.setAttribute('fill', fill);
            rect.setAttribute('stroke', stroke);
            rect.setAttribute('stroke-width', strokeWidth);
            whiteboard.svg.appendChild(rect);
        },
        json(fileFullPath) {
            const file = getFile(fileFullPath);
            if (!file) {
                return null;
            }
            const json = JSON.parse(file.content);
            return json;
        },
        gradient(x1, y1, x2, y2, stops) {
            const gradient = document.createElementNS(xmlns, 'linearGradient');

            const id = `gradient-${whiteboard.nextId}`;
            gradient.setAttribute('id', id);
            ++whiteboard.nextId;

            gradient.setAttribute('x1', x1);
            gradient.setAttribute('y1', y1);
            gradient.setAttribute('x2', x2);
            gradient.setAttribute('y2', y2);

            for (const [offset, color] of stops) {
                const stopEle = document.createElementNS(xmlns, 'stop');
                stopEle.setAttribute('offset', offset);
                stopEle.setAttribute('stop-color', color);
                gradient.appendChild(stopEle);
            }

            whiteboard.defs.appendChild(gradient);
            return `url(#${id})`;
        },
    };

    main();
})();
