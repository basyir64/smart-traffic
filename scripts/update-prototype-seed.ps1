# scripts/update-prototype-seed.ps1
$htmlFile = "SMART_TRAFFIC_AI_Dashboard_Prototype.html"
$content = [System.IO.File]::ReadAllText($htmlFile, [System.Text.Encoding]::UTF8)

$oldSiasatanSubmit = @'
$('siasatanCount').textContent=R.length+' rekod';$('siasatanTable').innerHTML='<tr><th>No. Saman</th><th>No. Kenderaan</th><th>Lokasi Hotspot</th><th>Tempat</th><th>Tarikh & Waktu</th><th>Kenderaan</th><th>Kesalahan</th><th>Binatang</th><th>Jenis Kemalangan</th><th>Maut</th></tr>'+R.map(x=>`<tr><td>${x.saman}</td><td>${x.kenderaan}</td><td>${x.locationName}</td><td>${x.tempat}</td><td>${x.tarikh} ${x.waktu}</td><td>${x.kategori}</td><td>${x.kesalahan}</td><td>${x.binatang}</td><td>${x.jenisKemalangan}</td><td>${x.mautText}</td></tr>`).join('');
'@

$newSiasatanSubmit = @'
renderSiasatanTable();
'@

$oldOpsSubmit = @'
$('penguatkuasaanCount').textContent=OP.length+' operasi';$('penguatkuasaanTable').innerHTML='<tr><th>Tarikh</th><th>Lokasi</th><th>Jenis Operasi</th><th>Kat. Kemalangan</th><th>Tangkapan</th><th>Sita</th><th>Masa</th></tr>'+OP.map(o=>`<tr><td>${o.tarikh}</td><td>${o.locationName}</td><td>${o.jenisOperasi}</td><td>${o.kategoriKemalangan}</td><td>${o.tangkapan}</td><td>${o.sita}</td><td>${o.jamMula}–${o.jamAkhir}</td></tr>`).join('');
'@

$newOpsSubmit = @'
renderPenguatkuasaanTable();
'@

if ($content.Contains($oldSiasatanSubmit)) {
    $content = $content.Replace($oldSiasatanSubmit, $newSiasatanSubmit)
    Write-Host "Updated siasatanForm submission"
} else {
    Write-Host "Warning: oldSiasatanSubmit not found!"
}

if ($content.Contains($oldOpsSubmit)) {
    $content = $content.Replace($oldOpsSubmit, $newOpsSubmit)
    Write-Host "Updated penguatkuasaanForm submission"
} else {
    Write-Host "Warning: oldOpsSubmit not found!"
}

[System.IO.File]::WriteAllText($htmlFile, $content, [System.Text.Encoding]::UTF8)
Write-Host "Done."
