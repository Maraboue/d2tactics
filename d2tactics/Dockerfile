# syntax=docker/dockerfile:1

# --- Build stage ---
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app

# Copy wrapper + pom first for better caching
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./

# Make wrapper executable and normalize line endings (important on Windows)
RUN chmod +x mvnw && sed -i 's/\r$//' mvnw

# Pre-fetch deps
RUN ./mvnw -q -DskipTests dependency:go-offline

# Now copy sources and build
COPY src ./src
RUN ./mvnw -q -DskipTests package

# --- Run stage ---
FROM eclipse-temurin:21-jre
WORKDIR /app
# Adjust the wildcard if your jar isn't a SNAPSHOT
COPY --from=build /app/target/*-SNAPSHOT.jar /app/app.jar
EXPOSE 8080
ENV PORT=8080
ENTRYPOINT ["java","-Dserver.port=${PORT}","-jar","/app/app.jar"]
