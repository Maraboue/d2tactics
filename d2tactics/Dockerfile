# syntax=docker/dockerfile:1

# --- Build stage ---
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app

# Copy Maven wrapper & pom first for better caching
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN ./mvnw -q -DskipTests dependency:go-offline

# Copy source and build
COPY src ./src
RUN ./mvnw -q -DskipTests package

# --- Run stage ---
FROM eclipse-temurin:21-jre
WORKDIR /app

# If your jar isn't SNAPSHOT, change to *.jar
COPY --from=build /app/target/*-SNAPSHOT.jar /app/app.jar

EXPOSE 8080
# Render sets $PORT; pass it through to Spring Boot
ENV PORT=8080
ENTRYPOINT ["java","-Dserver.port=${PORT}","-jar","/app/app.jar"]
