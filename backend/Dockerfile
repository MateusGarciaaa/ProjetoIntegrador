# syntax=docker/dockerfile:1
# =============================================================================
# ChurchHub API - Imagem da aplicação (multi-stage)
# -----------------------------------------------------------------------------
# Estágio 1 (build): compila o projeto com Maven + JDK.
# Estágio 2 (runtime): roda só o .jar com JRE, sem Maven, sem código-fonte.
# Resultado: imagem final menor e com menos superfície de ataque.
# =============================================================================

# ---------- Estágio 1: build ----------
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace

# Copia primeiro só o pom.xml: se ele não mudar, o Docker reaproveita o cache
# das dependências e o rebuild fica muito mais rápido.
COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2 mvn -B -q dependency:go-offline

# Agora o código-fonte (muda com frequência, por isso vem depois).
COPY src ./src

# -DskipTests: os testes de integração precisam de um banco rodando, que não
# existe durante o build da imagem. Testes rodam no CI/IDE, não aqui.
RUN --mount=type=cache,target=/root/.m2 mvn -B -q package -DskipTests \
    && cp target/*.jar app.jar

# ---------- Estágio 2: runtime ----------
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Nunca rodar como root dentro do container (18-Seguranca.md).
RUN addgroup -S churchhub && adduser -S churchhub -G churchhub
USER churchhub

COPY --from=build --chown=churchhub:churchhub /workspace/app.jar app.jar

# APP_TIMEZONE é a única fonte do fuso: a aplicação cria o Clock nele (app.time.zone) e a JVM
# o usa como padrão (-Duser.timezone no ENTRYPOINT) para logs e datas fora das regras de negócio.
# O docker-compose repassa o valor do .env; sem ele, vale o padrão abaixo.
ENV APP_TIMEZONE=America/Sao_Paulo \
    JAVA_OPTS="-XX:MaxRAMPercentage=75"

EXPOSE 8080

# "exec" faz o Java ser o PID 1 e receber o sinal de parada corretamente
# (docker compose down encerra a aplicação de forma limpa).
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -Duser.timezone=$APP_TIMEZONE -jar app.jar"]
