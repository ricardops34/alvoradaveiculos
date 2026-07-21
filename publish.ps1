param(
    [string]$Tag = "latest"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot
$ApiImage = "bjsoftware/alvorada-api:$Tag"
$CrmImage = "bjsoftware/alvorada-crm:$Tag"

function Invoke-DockerStep {
    param(
        [string]$Description,
        [scriptblock]$Command
    )

    Write-Host "`n$Description" -ForegroundColor Green
    & $Command

    if ($LASTEXITCODE -ne 0) {
        throw "Falha em: $Description (codigo $LASTEXITCODE)"
    }
}

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Publicacao no Docker Hub" -ForegroundColor Cyan
Write-Host " Organizacao: bjsoftware" -ForegroundColor Yellow
Write-Host " Tag: $Tag" -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Cyan

Push-Location $ProjectRoot

try {
    Invoke-DockerStep "[1/4] Build da API: $ApiImage" {
        docker build --file server/Dockerfile --tag $ApiImage server
    }

    Invoke-DockerStep "[2/4] Envio da API para o Docker Hub" {
        docker push $ApiImage
    }

    Invoke-DockerStep "[3/4] Build do CRM: $CrmImage" {
        docker build --file Dockerfile --tag $CrmImage .
    }

    Invoke-DockerStep "[4/4] Envio do CRM para o Docker Hub" {
        docker push $CrmImage
    }

    Write-Host "`n=========================================" -ForegroundColor Cyan
    Write-Host " Imagens publicadas com sucesso:" -ForegroundColor Green
    Write-Host " - $ApiImage"
    Write-Host " - $CrmImage"
    Write-Host "=========================================" -ForegroundColor Cyan
}
finally {
    Pop-Location
}
