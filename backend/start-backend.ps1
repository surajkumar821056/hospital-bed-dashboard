param(
    [string]$DatabaseUser = 'medresq',
    [string]$DatabaseUrl = 'jdbc:mysql://localhost:3306/medresq'
)

$ErrorActionPreference = 'Stop'
$databaseSecret = Read-Host "MySQL user '$DatabaseUser' ka password likho (typing screen par nahi dikhegi)" -AsSecureString
$databaseCredential = New-Object System.Management.Automation.PSCredential($DatabaseUser, $databaseSecret)
$databasePassword = $databaseCredential.GetNetworkCredential().Password
if ([string]::IsNullOrEmpty($databasePassword)) {
    throw 'Password khali hai. Script dobara chalao aur medresq user ka password enter karo.'
}

$previousUser = $env:DATABASE_USER
$previousPassword = $env:DATABASE_PASSWORD
$previousUrl = $env:DATABASE_URL
$backendExitCode = 1
try {
    $env:DATABASE_USER = $DatabaseUser
    $env:DATABASE_PASSWORD = $databasePassword
    $env:DATABASE_URL = $DatabaseUrl
    $databasePassword = $null
    Write-Host "Starting backend with MySQL user '$DatabaseUser'. Password supplied securely."
    Push-Location -LiteralPath $PSScriptRoot
    try {
        & (Join-Path $PSScriptRoot 'mvnw.cmd') 'spring-boot:run'
        $backendExitCode = $LASTEXITCODE
    }
    finally { Pop-Location }
}
finally {
    $env:DATABASE_USER = $previousUser
    $env:DATABASE_PASSWORD = $previousPassword
    $env:DATABASE_URL = $previousUrl
    $databaseSecret.Dispose()
    $databaseCredential = $null
    $databasePassword = $null
}
exit $backendExitCode
