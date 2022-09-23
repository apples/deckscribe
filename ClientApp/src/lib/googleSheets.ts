

export async function fetchGoogleSheets(url: string, sheet: string): Promise<string> {
    const regex = /\/spreadsheets\/d\/([^/]+)/;
    const match = url.match(regex);
    if (!match) {
        throw new Error(`Invalid Google Sheets URL: ${url}`);
    }
    const id = match[1];
    const response = await fetch(`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${sheet}`);
    const data = await response.text();
    return data;
}
