// TERRA desktop launcher.
//
// A tiny static web server that embeds the built TERRA web app and serves it
// over http://127.0.0.1, then opens the default browser. Serving over http
// (rather than opening the files directly with file://) is what makes the 3D
// globe work reliably: CesiumJS needs same-origin web workers to build the
// globe surface, which browsers refuse to load from a file:// page. Live data
// (USGS earthquakes, NOAA/NWS alerts, Open-Meteo search) is fetched over the
// internet at runtime; everything else is bundled, so no build step or API key
// is required.
package main

import (
	"embed"
	"fmt"
	"io"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os/exec"
	"runtime"
	"time"
)

// The built web app is copied here by the build script before compiling.
//
//go:embed all:dist
var content embed.FS

func openBrowser(url string) {
	var err error
	switch runtime.GOOS {
	case "windows":
		err = exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
	case "darwin":
		err = exec.Command("open", url).Start()
	default:
		err = exec.Command("xdg-open", url).Start()
	}
	if err != nil {
		log.Printf("Could not open the browser automatically: %v", err)
		log.Printf("Open this address manually: %s", url)
	}
}

func main() {
	sub, err := fs.Sub(content, "dist")
	if err != nil {
		log.Fatalf("embedded app missing: %v", err)
	}

	// Prefer an ephemeral port; fall back to a fixed one.
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		ln, err = net.Listen("tcp", "127.0.0.1:8787")
		if err != nil {
			log.Fatalf("could not start local server: %v", err)
		}
	}
	port := ln.Addr().(*net.TCPAddr).Port
	url := fmt.Sprintf("http://127.0.0.1:%d/", port)

	mux := http.NewServeMux()

	// Proxy CelesTrak (satellite orbital elements) through our own origin, since
	// its browser CORS is unreliable (spec §15 server-side proxying).
	mux.HandleFunc("/api/celestrak", func(w http.ResponseWriter, r *http.Request) {
		target := "https://celestrak.org/NORAD/elements/gp.php"
		if r.URL.RawQuery != "" {
			target += "?" + r.URL.RawQuery
		}
		req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, target, nil)
		if err != nil {
			http.Error(w, "bad request", http.StatusBadRequest)
			return
		}
		req.Header.Set("User-Agent", "TERRA/1.0 (desktop launcher)")
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			http.Error(w, "upstream error", http.StatusBadGateway)
			return
		}
		defer resp.Body.Close()
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		w.WriteHeader(resp.StatusCode)
		_, _ = io.Copy(w, resp.Body)
	})

	mux.Handle("/", http.FileServer(http.FS(sub)))

	fmt.Println("====================================================")
	fmt.Println("  TERRA — Planet-Scale Live Tracking")
	fmt.Printf("  Running at: %s\n", url)
	fmt.Println("  Keep this window open. Close it to stop TERRA.")
	fmt.Println("====================================================")

	go func() {
		time.Sleep(800 * time.Millisecond)
		openBrowser(url)
	}()

	if err := http.Serve(ln, mux); err != nil {
		log.Fatalf("server stopped: %v", err)
	}
}
