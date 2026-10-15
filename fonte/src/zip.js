// ZIP mínimo (sem compressão): suficiente para alguns arquivos de texto pequenos, sem depender de biblioteca.
// Nomes em UTF-8 (acentos funcionam); pastas entram como parte do nome ("treinos/treino-001.json").

const TABELA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = TABELA_CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** arquivos: [{ nome, conteudo: string }] -> Uint8Array com o .zip */
export function criarZip(arquivos, agora = new Date()) {
  const texto = new TextEncoder();
  const hora = (agora.getHours() << 11) | (agora.getMinutes() << 5) | (agora.getSeconds() >> 1);
  const data = ((Math.max(1980, agora.getFullYear()) - 1980) << 9) | ((agora.getMonth() + 1) << 5) | agora.getDate();
  const locais = [];
  const central = [];
  let deslocamento = 0;

  for (const { nome, conteudo } of arquivos) {
    const n = texto.encode(nome);
    const dados = texto.encode(conteudo);
    const crc = crc32(dados);

    const loc = new DataView(new ArrayBuffer(30));
    loc.setUint32(0, 0x04034b50, true);
    loc.setUint16(4, 20, true); // versão necessária
    loc.setUint16(6, 0x0800, true); // nomes em UTF-8
    loc.setUint16(8, 0, true); // sem compressão
    loc.setUint16(10, hora, true);
    loc.setUint16(12, data, true);
    loc.setUint32(14, crc, true);
    loc.setUint32(18, dados.length, true);
    loc.setUint32(22, dados.length, true);
    loc.setUint16(26, n.length, true);
    locais.push(new Uint8Array(loc.buffer), n, dados);

    const cen = new DataView(new ArrayBuffer(46));
    cen.setUint32(0, 0x02014b50, true);
    cen.setUint16(4, 20, true);
    cen.setUint16(6, 20, true);
    cen.setUint16(8, 0x0800, true);
    cen.setUint16(10, 0, true);
    cen.setUint16(12, hora, true);
    cen.setUint16(14, data, true);
    cen.setUint32(16, crc, true);
    cen.setUint32(20, dados.length, true);
    cen.setUint32(24, dados.length, true);
    cen.setUint16(28, n.length, true);
    cen.setUint32(42, deslocamento, true);
    central.push(new Uint8Array(cen.buffer), n);

    deslocamento += 30 + n.length + dados.length;
  }

  const tamanhoCentral = central.reduce((s, p) => s + p.length, 0);
  const fim = new DataView(new ArrayBuffer(22));
  fim.setUint32(0, 0x06054b50, true);
  fim.setUint16(8, arquivos.length, true);
  fim.setUint16(10, arquivos.length, true);
  fim.setUint32(12, tamanhoCentral, true);
  fim.setUint32(16, deslocamento, true);

  const partes = [...locais, ...central, new Uint8Array(fim.buffer)];
  const saida = new Uint8Array(partes.reduce((s, p) => s + p.length, 0));
  let pos = 0;
  for (const p of partes) {
    saida.set(p, pos);
    pos += p.length;
  }
  return saida;
}
