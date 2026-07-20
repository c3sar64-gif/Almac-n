FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /app

COPY src/SistemaAlmacen.Core/SistemaAlmacen.Core.csproj src/SistemaAlmacen.Core/
COPY src/SistemaAlmacen.Infrastructure/SistemaAlmacen.Infrastructure.csproj src/SistemaAlmacen.Infrastructure/
COPY src/SistemaAlmacen.Api/SistemaAlmacen.Api.csproj src/SistemaAlmacen.Api/
RUN dotnet restore src/SistemaAlmacen.Api/SistemaAlmacen.Api.csproj

COPY src/ src/
RUN dotnet publish src/SistemaAlmacen.Api/SistemaAlmacen.Api.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "SistemaAlmacen.Api.dll"]
