param(
  [ValidateSet('mysql', 'oracle')]
  [string]$Banco,
  [switch]$Parar
)

# Stop on PowerShell errors so a failed command is not reported as a successful start.
$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot
$arquivoEnv = Join-Path $raiz '.env.docker'

# Create independent credentials for the database administrator and application account.
function New-SenhaAleatoria {
  $bytes = New-Object byte[] 32
  $gerador = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $gerador.GetBytes($bytes)
    return ([System.BitConverter]::ToString($bytes)).Replace('-', '').ToLowerInvariant()
  } finally {
    $gerador.Dispose()
  }
}

if (-not $Banco) {
  Write-Host 'Qual banco deseja usar?'
  Write-Host '1. MySQL'
  Write-Host '2. Oracle'
  $opcao = Read-Host 'Digite 1 ou 2'
  if ($opcao -eq '1') {
    $Banco = 'mysql'
  } elseif ($opcao -eq '2') {
    $Banco = 'oracle'
  } else {
    throw 'Opção inválida. Execute novamente e escolha 1 ou 2.'
  }
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw 'Docker CLI não encontrado. Instale Docker Desktop ou configure o cliente Docker para um Docker Engine em execução.'
}

# Never replace credentials after database volumes exist: the passwords are stored in the database.
if (-not (Test-Path $arquivoEnv)) {
  foreach ($volume in @('pi2-compose-mysql-data', 'pi2-compose-oracle-data')) {
    & docker volume inspect $volume *> $null
    if ($LASTEXITCODE -eq 0) {
      throw "O volume $volume já existe, mas .env.docker não foi encontrado. Não gere novas senhas para um banco existente; restaure o arquivo .env.docker original."
    }
  }

  $linhas = @(
    "MYSQL_ROOT_PASSWORD=$(New-SenhaAleatoria)"
    "MYSQL_APP_PASSWORD=$(New-SenhaAleatoria)"
    "ORACLE_ADMIN_PASSWORD=$(New-SenhaAleatoria)"
    "ORACLE_APP_PASSWORD=$(New-SenhaAleatoria)"
    'MYSQL_PORT=3308'
    'ORACLE_PORT=1522'
    'APP_PORT=3000'
  )
  $utf8SemBOM = New-Object -TypeName System.Text.UTF8Encoding -ArgumentList $false
  [System.IO.File]::WriteAllLines($arquivoEnv, $linhas, $utf8SemBOM)
  Write-Host 'Credenciais locais foram geradas em .env.docker. Mantenha esse arquivo privado para reutilizar seus bancos.'
}

# Compose reads this private env file and starts only the selected database profile.
$argumentos = @('compose', '--env-file', $arquivoEnv, '--profile', $Banco)
Push-Location $raiz
try {
  if ($Parar) {
    # "down" stops containers but leaves named volumes untouched.
    & docker @argumentos down
  } else {
    & docker @argumentos up --build --detach
  }
  if ($LASTEXITCODE -ne 0) {
    throw 'Docker Compose falhou. Confira se o Docker Desktop está iniciado e leia a mensagem acima.'
  }
} finally {
  Pop-Location
}

if ($Parar) {
  Write-Host "Serviços $Banco parados. O volume de dados foi preservado."
} else {
  $linhaPorta = Get-Content $arquivoEnv | Where-Object { $_ -match '^APP_PORT=' }
  $portaApp = $linhaPorta -replace '^APP_PORT=', ''
  Write-Host "PI2 iniciado com $Banco em http://127.0.0.1:$portaApp."
  Write-Host 'O primeiro início pode demorar enquanto as imagens são baixadas e o banco é preparado.'
  Write-Host "Para parar sem apagar dados: .\scripts\iniciar-docker.ps1 -Banco $Banco -Parar"
}
