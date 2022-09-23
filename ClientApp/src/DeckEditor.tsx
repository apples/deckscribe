import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import logo from './logo.svg';
import './App.css';
import Editor from '@monaco-editor/react';
import { useUser } from './hooks/useUser';
import { useNavigate, useParams } from 'react-router-dom';
import { HubConnectionState } from '@microsoft/signalr';
import { useDispatch } from 'react-redux';
import { DeckData, DeckFile, DeckFileText, setDeckData, setDeckDataField, setWorkingDeckData, updateFiles } from './store/collabSlice';
import { useAppSelector } from './store/hooks';
import { store } from './store/store';
import { useGetDeckByIdDataQuery, useGetDeckByIdNameQuery, usePatchDeckByIdDataMutation, usePutDeckByIdDataMutation } from './store/api';
import { useCollabHub } from './hooks/useCollabHub';
import { compare } from 'fast-json-patch';
import { AxiosError } from 'axios';
import { deckscribeAxios } from './store/apiBase';
import axios from 'axios';
import { editor, Range } from 'monaco-editor';
import { diffChars } from 'diff';
import { renderCard } from './lib/renderCard';
import { parse } from 'csv-parse/browser/esm/sync';
import { fetchGoogleSheets } from './lib/googleSheets';
import { saveAs } from 'file-saver';

export function DeckEditor() {
  const params = useParams();

  const deckId = parseInt(params.deckId ?? '');

  const { } = useUser({ whenLoggedOutRedirectTo: '/' });

  const dispatch = useDispatch();

  const { data: deckName } = useGetDeckByIdNameQuery({ id: deckId }, { refetchOnMountOrArgChange: true });

  const { data: versionedDeckData, refetch, isFetching, isUninitialized } = useGetDeckByIdDataQuery({ id: deckId }, { skip: !deckId, refetchOnMountOrArgChange: true, refetchOnReconnect: true, refetchOnFocus: true });

  //const [triggerPutDeckData, { data: putResponse, isError: isPutError, error: putError, isLoading: isPutLoading }] = usePutDeckByIdDataMutation();
  const [triggerPatchDeckData, { data: patchResponse, isError: isPatchError, error: patchError, isLoading: isPatchLoading }] = usePatchDeckByIdDataMutation();

  const navigate = useNavigate();

  const originalDeckData = useAppSelector(state => state.collab.originalDeckData);
  const workingDeckData = useAppSelector(state => state.collab.workingDeckData);
  const workingVersion = useAppSelector(state => state.collab.workingVersion);
  const dirty = useAppSelector(state => state.collab.dirty);

  //const { status, serverMethods } = useCollabHubState(deckId ? deckId : null);
  const { status: collabHubStatus, serverMethods } = useCollabHub(deckId ? deckId : null, {
    refetch(version) {
      if (workingVersion !== version) {
        refetch();
      }
    },
  });

  useEffect(() => {
    return () => {
      dispatch(setDeckData({ deckData: null, version: null }));
    };
  }, [dispatch, deckId]);

  useEffect(() => {
    if (isUninitialized && collabHubStatus === HubConnectionState.Connected) {
      refetch();
    }
  }, [isUninitialized, collabHubStatus]);

  useEffect(() => {
    if (versionedDeckData) {
      if (versionedDeckData.version !== workingVersion) {
        dispatch(setDeckData({ deckData: JSON.parse(versionedDeckData.deckData), version: versionedDeckData.version }));
      }
    }
  }, [versionedDeckData, workingVersion]);

  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (dirty && originalDeckData && workingDeckData && workingVersion && !timeoutRef.current && !isFetching && !isPatchLoading) {
      timeoutRef.current = window.setTimeout(async () => {
        timeoutRef.current = null;

        const patch = compare(originalDeckData, workingDeckData);

        try {
          console.log('Sending patch: ', patch);
          const response = await triggerPatchDeckData({ id: deckId, version: workingVersion, body: patch as any }).unwrap();

          dispatch(setDeckData({ deckData: JSON.parse(response.deckData), version: response.version }));

          refetch();
        } catch (e) {
          if (axios.isAxiosError(e)) {
            if (e.response?.status === 409) {
              refetch();
              return;
            }
          }

          throw e;
        }
      }, 1000);

      return () => {
        if (timeoutRef.current) {
          window.clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      };
    }
  }, [dirty, originalDeckData, workingDeckData, workingVersion, isFetching, isPatchLoading]);

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const monacoMounted = useCallback((editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
  }, []);

  const scriptText = workingDeckData?.scriptText;

  useEffect(() => {
    if (editorRef.current) {
      const current = editorRef.current.getValue();

      if (current !== scriptText) {
        const currentPos = editorRef.current.getPosition();

        console.log('Setting editor value because', { current, scriptText });

        editorRef.current.setValue(scriptText ?? '');

        if (currentPos) {
          editorRef.current.setPosition(currentPos);
        }
      }
    }
  }, [scriptText]);

  const importGoogleSheet = useCallback(async () => {
    if (!workingDeckData) {
      console.warn('No working deck data');
      return;
    }
    if (!workingDeckData.googleSheetsUrl) {
      alert('No Google Sheets URL set');
      return;
    }
    if (!workingDeckData.googleSheetsSheet) {
      alert('No Google Sheets sheet set');
      return;
    }
    if (!workingDeckData.googleSheetsDestination) {
      alert('No Google Sheets destination set');
      return;
    }

    const data = await fetchGoogleSheets(workingDeckData.googleSheetsUrl, workingDeckData.googleSheetsSheet);

    if (!data) {
      alert('Failed to fetch Google Sheets data');
      return;
    }
    
    const file: DeckFileText = {
      type: 'text',
      contents: data,
      fullPath: workingDeckData.googleSheetsDestination,
    }

    dispatch(updateFiles({ files: [file] }));
  }, [workingDeckData]);

  const backupDownload = useCallback(() => {
   if (!deckName) {
     alert('Waiting for deck name');
     return;
   }

    const data = JSON.stringify(workingDeckData);
    const blob = new Blob([data], { type: 'application/json' });
    saveAs(blob, `${deckName}-deckscribe.json`);
  }, [workingDeckData]);

  const backupRestore = useCallback(() => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.addEventListener('change', async () => {
      if (!fileInput.files || fileInput.files.length === 0) {
        console.warn('No file selected');
        return;
      }
      const file = fileInput.files[0];
      const data = await file.text();
      const newDeck = JSON.parse(data);
      dispatch(setWorkingDeckData({ deckData: newDeck }));
    });
    fileInput.click();
  }, [workingDeckData]);

  const setScriptText = useCallback((value: string | undefined) => {
    dispatch(setDeckDataField({ field: 'scriptText', value: value ?? '' }));
  }, [dispatch]);

  const gotoDashboard = useCallback(() => {
    navigate('/dashboard');
  }, [navigate]);

  if (collabHubStatus !== HubConnectionState.Connected) {
    return <div>Connecting...</div>;
  }

  if (versionedDeckData == null || workingDeckData == null) {
    return <div>Awaiting deck data...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex' }}>
        <button onClick={gotoDashboard}>Dashboard</button>
        <div>
          {deckName == null ? '(loading name...)' : deckName}
        </div>
        <div>|</div>
        {
          isFetching ? <div>Fetching...</div> :
          collabHubStatus === HubConnectionState.Connected ? <div>Connected</div> :
          collabHubStatus === HubConnectionState.Connecting ? <div>Connecting...</div> :
          collabHubStatus === HubConnectionState.Disconnected ? <div>Disconnected!</div> :
          collabHubStatus === HubConnectionState.Disconnecting ? <div>Disconnecting...</div> :
          collabHubStatus === HubConnectionState.Reconnecting ? <div>Reconnecting...</div> :
          <></>
        }
      </div>
      <div className="wrapper">
        <div>
          <Editor
            theme='vs-dark'
            height="600px"
            defaultLanguage="javascript"
            defaultValue={workingDeckData.scriptText}
            onChange={setScriptText}
            onMount={monacoMounted}
          />
          <div className="header">
            <button onClick={backupDownload}>Download Backup</button>
            <button onClick={backupRestore}>Restore Backup</button>
            <DeckDataField label="Data file" type="text" field="dataFilePath" />
          </div>
          <div className="header">
            <DeckDataField label="DPI" type="number" field='cardDPI' />
            <DeckDataField label="TTS Filename Prefix" type="text" field='ttsFileNamePrefix' />
            <button id="render-all-button">Publish All</button>
          </div>
          <div className="header">
            <DeckDataField label="Google Sheets URL" type="text" field='googleSheetsUrl' />
            <DeckDataField label="Sheet Name" type="text" field='googleSheetsSheet' />
            <DeckDataField label="Destination File" type="text" field='googleSheetsDestination' />
            <button onClick={importGoogleSheet}>Import Sheet</button>
          </div>
          <div className="header">
            <FileUploader />
          </div>
          <FileList deckData={workingDeckData} />
        </div>
        <PreviewCanvas />
      </div>
    </div>
  );
}

function PreviewCanvas() {
  const [cardIndex, setCardIndex] = useState(1);

  const deckData = useAppSelector((state) => state.collab.workingDeckData);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const setRef = useCallback((canvas: HTMLCanvasElement | null) => {
    canvasRef.current = canvas;
  }, []);

  const csvData = useMemo(() => {
    if (!deckData) {
      return null;
    }
    const dataFile = deckData.files[deckData.dataFilePath];
    if (!dataFile) {
      console.warn(`Data file ${deckData.dataFilePath} not found`);
      return null;
    }
    if (dataFile.type !== 'text') {
      console.warn(`Data file ${deckData.dataFilePath} is not text`);
      return null;
    }
    const csvData = parse(dataFile.contents);
    if (csvData.length < 2) {
      console.warn(`Data file ${deckData.dataFilePath} has no rows`);
      return null;
    }
    return csvData;
  }, [deckData]);

  useEffect(() => {
    if (canvasRef.current && deckData && csvData) {
      renderCard(canvasRef.current, deckData, csvData, cardIndex);
    }
  }, [canvasRef, deckData, csvData, cardIndex]);

  const toFirst = useCallback(() => {
    setCardIndex(1);
  }, []);

  const toPrev = useCallback(() => {
    setCardIndex((i) => Math.max(1, i - 1));
  }, []);

  const toNext = useCallback(() => {
    setCardIndex((i) => Math.min(csvData?.length ?? 1, i + 1));
  }, [csvData]);

  const toLast = useCallback(() => {
    setCardIndex(csvData?.length ?? 1);
  }, [csvData]);

  return (
    <div>
      <div>
        <canvas className='previewCanvas' ref={setRef} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <button onClick={toFirst}>{'<<<'}</button>
        <button onClick={toPrev}>{'<—'}</button>
        <button onClick={toNext}>{'—>'}</button>
        <button onClick={toLast}>{'>>>'}</button>
      </div>
    </div>
  );
}

function DeckDataField({ label, type, field, readonly }: { label: string, type: string, field: keyof DeckData, readonly?: boolean }) {
  const dispatch = useDispatch();

  const fieldValue = useAppSelector((state) => state.collab.workingDeckData?.[field]);

  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (type === 'number') {
      dispatch(setDeckDataField({ field, value: +e.target.value }));
    } else {
      dispatch(setDeckDataField({ field, value: e.target.value }));
    }
  }, [field, type, dispatch]);

  if (typeof fieldValue === 'object') {
    throw new Error('Cannot render object');
  }

  return <label>{label}: <input type={type ?? 'text'} value={fieldValue} onChange={onChange} readOnly={readonly} /></label>
}

function FileList({ deckData }: { deckData: DeckData | null }) {
  if (deckData == null) {
    return <div>No deck data</div>;
  }

  const files = Object.values(deckData.files);
  files.sort((a, b) => a.fullPath.localeCompare(b.fullPath));

  if (deckData == null || files.length === 0) {
    return <div>No files</div>;
  }

  return (
    <div className="filelist">
      {files.map((file) => (
        <FileRow key={file.fullPath} file={file} />
      ))}
    </div>
  )
}

function FileRow({ file }: { file: DeckFile }) {
  return (
    <div className="file">
      <div className="filebuttons">
        <button className="filedelete">❌</button>
        <button className="filerename">✍</button>
      </div>
      <div className="filename">{file.fullPath}</div>
      <div className="fileimage">
        {file.type === 'image' ? <img src={file.url} /> : '(no image)'}
      </div>
    </div>
  );
}

function FileUploader({ }: { }) {
  const [fullpage, setFullpage] = useState(false);
  const [loading, setLoading] = useState(false);

  const lastDragEnter = useRef<EventTarget | null>(null);

  const dispatch = useDispatch();

  // dragenter
  useEffect(() => {
    const listener = (ev: DragEvent) => {
      ev.preventDefault();
      lastDragEnter.current = ev.target;
      if (ev.dataTransfer?.types.includes('Files')) {
        setFullpage(true);
      }
    };
    window.addEventListener('dragenter', listener);
    return () => window.removeEventListener('dragenter', listener);
  }, []);

  // dragleave
  useEffect(() => {
    const listener = (ev: DragEvent) => {
      ev.preventDefault();
      if (ev.target === lastDragEnter.current) {
        setFullpage(false);
      }
    };
    window.addEventListener('dragleave', listener);
    return () => window.removeEventListener('dragleave', listener);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setFullpage(false);
    setLoading(true);

    const loadFile = (entry: FileSystemFileEntry) => {
      return new Promise<DeckFile | null>((resolve, reject) => {
        entry.file((file) => {
          let reader = new FileReader();
          if (entry.fullPath.endsWith('.png')) {
            reader.readAsDataURL(file);
            reader.onload = () => {
              let imgurl = URL.createObjectURL(file);
              let img = document.createElement('img');
              img.addEventListener('load', (ev) => {
                console.log(`Loaded image file ${entry.fullPath}`);
                resolve({
                  fullPath: entry.fullPath,
                  type: 'image',
                  url: reader.result as string,
                  width: img.naturalWidth,
                  height: img.naturalHeight,
                });
              });
              img.src = imgurl;
            };
          } else if (/\.(csv|txt|json)$/.test(entry.fullPath)) {
            reader.readAsText(file);
            reader.onload = () => {
              console.log(`Loaded CSV file ${entry.fullPath}`);
              resolve({
                fullPath: entry.fullPath,
                type: 'text',
                contents: reader.result as string,
              });
            }
          } else {
            console.log(`Loaded unknown file ${entry.fullPath}`);
            alert(`Unknown file type: ${entry.fullPath}`);
            resolve(null);
          }
        });
      });
    };

    const walkTree = (entry: FileSystemEntry) => {
      let promise = new Promise<(DeckFile | null)[]>((resolve, reject) => {
        if (entry.isFile) {
          loadFile(entry as FileSystemFileEntry).then((file) => { resolve([file]); });
        }
        else if (entry.isDirectory) {
          (entry as FileSystemDirectoryEntry).createReader().readEntries((entries) => {
            let promises: Promise<(DeckFile | null)[]>[] = [];
            for (let entry of entries) {
              promises.push(walkTree(entry));
            }
            Promise.all(promises).then((arrs) => {
              resolve(arrs.flat());
            });
          });
        }
      });

      return promise;
    };

    const promises = [];
    for (let item of e.dataTransfer.items) {
      let entry = item.webkitGetAsEntry();
      if (entry) {
        promises.push(walkTree(entry));
      }
    }
    Promise.all(promises)
      .then((arrs) => {
        let files = arrs.flat().filter((file) => file != null) as DeckFile[];
        console.log("Loaded files", files);
        dispatch(updateFiles({ files }));
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [dispatch]);

  return (
    <div
      className={`uploadbox ${fullpage ? 'fullpage' : ''}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      Drag new files here
      {loading ? <span className="loader" /> : null}
    </div>
  );
}
