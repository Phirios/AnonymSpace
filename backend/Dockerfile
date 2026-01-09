# Build stage - use native platform for building
FROM --platform=$BUILDPLATFORM rust:1.85-slim AS builder

ARG TARGETPLATFORM

WORKDIR /app

# Install build dependencies and cross-compilation tools
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    gcc-x86-64-linux-gnu \
    libc6-dev-amd64-cross \
    && rm -rf /var/lib/apt/lists/*

# Add the target and configure cross-compilation
RUN rustup target add x86_64-unknown-linux-gnu

ENV CARGO_TARGET_X86_64_UNKNOWN_LINUX_GNU_LINKER=x86_64-linux-gnu-gcc
ENV PKG_CONFIG_ALLOW_CROSS=1
ENV OPENSSL_DIR=/usr
ENV OPENSSL_LIB_DIR=/usr/lib/x86_64-linux-gnu
ENV OPENSSL_INCLUDE_DIR=/usr/include

# Copy manifests
COPY Cargo.toml Cargo.lock* ./

# Create dummy main.rs to cache dependencies
RUN mkdir src && echo "fn main() {}" > src/main.rs

# Pin home crate to version compatible with Rust 1.85
RUN cargo update home --precise 0.5.9

# Build dependencies only
RUN cargo build --release --target x86_64-unknown-linux-gnu && rm -rf src

# Copy actual source code and migrations
COPY src ./src
COPY migrations ./migrations

# Build the application (touch to update timestamp)
RUN touch src/main.rs && cargo build --release --target x86_64-unknown-linux-gnu

# Production stage
FROM --platform=linux/amd64 debian:bookworm-slim AS runner

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y ca-certificates libssl3 && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -r -u 1001 appuser

# Copy binary
COPY --from=builder /app/target/x86_64-unknown-linux-gnu/release/backend ./backend

# Copy migrations
COPY migrations ./migrations

USER appuser

EXPOSE 3001

CMD ["./backend"]
