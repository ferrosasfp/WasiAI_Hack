import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const PINATA_JWT = process.env.PINATA_JWT; // Preferible
    const PINATA_API_KEY = process.env.PINATA_API_KEY;
    const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;
    if (!PINATA_JWT && (!PINATA_API_KEY || !PINATA_SECRET_KEY)) {
      return NextResponse.json({ error: 'Pinata credentials missing (provide PINATA_JWT or API key/secret)' }, { status: 500 });
    }

    const form = await req.formData();
    const file = form.get('file') as File | null;
    const metadataJson = form.get('metadata') as string | null;

    if (!file || !metadataJson) {
      return NextResponse.json({ error: 'file and metadata are required' }, { status: 400 });
    }

    // 1) Subir archivo a Pinata (pinFileToIPFS)
    const fileForm = new FormData();
    fileForm.append('file', file, (file as any).name || 'model.bin');

    const commonHeaders: Record<string, string> = PINATA_JWT
      ? { Authorization: `Bearer ${PINATA_JWT}` }
      : { pinata_api_key: PINATA_API_KEY as string, pinata_secret_api_key: PINATA_SECRET_KEY as string };

    // We'll add Pinata metadata name after parsing metadataJson to derive a name
    const parsed = JSON.parse(metadataJson);
    const pinBaseName: string = (parsed?.slug as string) || (parsed?.name as string) || 'model';
    // Attach pinataMetadata to give the file a friendly name in Pinata UI
    fileForm.append('pinataMetadata', JSON.stringify({ name: pinBaseName, keyvalues: { kind: 'model-file' } }));

    const pinFileRes = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: commonHeaders as any,
      body: fileForm,
    });

    if (!pinFileRes.ok) {
      let details: any = undefined;
      try { details = await pinFileRes.json(); } catch { details = await pinFileRes.text(); }
      return NextResponse.json({ error: 'Pinata file upload failed', details }, { status: 502 });
    }

    const pinFileData = await pinFileRes.json();
    const fileCid = pinFileData.IpfsHash as string;

    // 2) Subir metadata JSON (inyectamos cid del archivo)
    const jsonBody = { ...parsed, file_cid: fileCid };

    const pinJsonRes = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(PINATA_JWT
          ? { Authorization: `Bearer ${PINATA_JWT}` }
          : { pinata_api_key: PINATA_API_KEY as string, pinata_secret_api_key: PINATA_SECRET_KEY as string }),
      } as any,
      body: JSON.stringify({
        pinataContent: jsonBody,
        pinataMetadata: { name: `${pinBaseName}.metadata`, keyvalues: { kind: 'model-metadata' } },
      }),
    });

    if (!pinJsonRes.ok) {
      let details: any = undefined;
      try { details = await pinJsonRes.json(); } catch { details = await pinJsonRes.text(); }
      return NextResponse.json({ error: 'Pinata metadata upload failed', details }, { status: 502 });
    }

    const pinJsonData = await pinJsonRes.json();
    const metadataCid = pinJsonData.IpfsHash as string;

    return NextResponse.json({ fileCid, metadataCid });
  } catch (e: any) {
    return NextResponse.json({ error: 'Unexpected error', details: String(e?.message || e) }, { status: 500 });
  }
}
