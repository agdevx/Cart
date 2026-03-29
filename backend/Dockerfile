FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY AGDevX.Cart.slnx .
COPY AGDevX.Cart.Api/AGDevX.Cart.Api.csproj AGDevX.Cart.Api/
COPY AGDevX.Cart.Services/AGDevX.Cart.Services.csproj AGDevX.Cart.Services/
COPY AGDevX.Cart.Auth/AGDevX.Cart.Auth.csproj AGDevX.Cart.Auth/
COPY AGDevX.Cart.Data/AGDevX.Cart.Data.csproj AGDevX.Cart.Data/
COPY AGDevX.Cart.Shared/AGDevX.Cart.Shared.csproj AGDevX.Cart.Shared/

RUN dotnet restore AGDevX.Cart.Api/AGDevX.Cart.Api.csproj

COPY . .
WORKDIR /src/AGDevX.Cart.Api
RUN dotnet publish AGDevX.Cart.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

RUN mkdir -p /app/data

COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:2946

EXPOSE 2946

ENTRYPOINT ["dotnet", "AGDevX.Cart.Api.dll"]
