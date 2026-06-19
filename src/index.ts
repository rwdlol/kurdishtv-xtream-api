import express, { Request, Response } from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const USERNAME = "rwdlol";
const PASSWORD = "rwdlol";

type LiveTVItem = {
  category_id: string;
  name: string;
  stream_icon: string;
  direct_source: string;
  added?: string;
  custom_sid?: string;
  epg_channel_id?: null | string;
  stream_type?: string;
  tv_archive?: number;
  tv_archive_duration?: number;
};

const LiveTVList: LiveTVItem[] = JSON.parse(
  fs.readFileSync(path.join(__dirname, "livetv.json"), "utf8"),
);

type LiveTVCategoryItem = {
  category_id: string;
  category_name: string;
  parent_id: number;
};

const LiveTVCategoryList: LiveTVCategoryItem[] = JSON.parse(
  fs.readFileSync(path.join(__dirname, "livetv_categories.json"), "utf8"),
);

// app.use(express.static("public"));

app.use((_req, res, next) => {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate",
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

// app.get("/", (_req, res) => {
//   res.sendFile(path.join(__dirname, "..", "public", "index.html"));
// });

app.get("/player_api.php", (req: Request, res: Response) => {
  const { username, password, action, category_id } = req.query;

  if (username !== USERNAME || password !== PASSWORD) {
    return res.json({ user_info: { auth: 0 } });
  }

  if (action === "get_live_categories") {
    return res.json(LiveTVCategoryList);
  }

  if (action === "get_live_streams") {
    const payload = LiveTVList.map((item, index) => {
      const STREAM_ID = Number(index + 1);
      return {
        num: Number(STREAM_ID),
        stream_id: Number(STREAM_ID),
        category_id: String(item.category_id),
        name: String(item.name),
        stream_icon: `${req.protocol}://${req.get("host")}/logo/${item.stream_icon}`,
        direct_source: "",
        added: "1780264800",
        custom_sid: "",
        epg_channel_id: null,
        stream_type: "live",
        tv_archive: 0,
        tv_archive_duration: 0,
      };
    });

    return res.json(
      category_id
        ? payload.filter((i) => i.category_id === String(category_id))
        : payload,
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const hostHeader = req.get("host") || "localhost:3000";
  const [serverUrl, serverPort] = hostHeader.split(":");

  return res.json({
    user_info: {
      auth: 1,
      username: USERNAME,
      password: PASSWORD,
      status: "Active",
      exp_date: "1893456000",
      allowed_output_formats: ["m3u8", "ts", "mp4"],
    },
    server_info: {
      url: serverUrl,
      port: serverPort || "3000",
      https_port: "443",
      server_protocol: req.protocol,
      timestamp_now: now,
      time_now: new Date().toISOString().slice(0, 19).replace("T", " "),
      timezone: "UTC",
    },
  });
});

app.get(/^\/live\/([^/]+)\/([^/]+)\/(.+)$/, liveHandler);
async function liveHandler(req: Request, res: Response) {
  const username = req.params[0];
  const password = req.params[1];
  const fullStreamParam = req.params[2];

  if (username !== USERNAME || password !== PASSWORD) {
    console.warn(
      `Unauthorized access attempt with username: ${username} and password: ${password}`,
    );
    return res.status(403).send("Forbidden");
  }

  // Detect if this is an HLS chunk/init segment request or a root manifest call
  let cleanId = fullStreamParam.replace(
    /\.(init\.hls\.fmp4|m3u8|m3u|ts|mp4|fmp4)$/i,
    "",
  );
  let isSegment = false;
  let segmentFilename = "";

  // If the request contains sub-paths, parse out the channel index context
  if (cleanId.includes("/")) {
    const parts = fullStreamParam.split("/");
    cleanId = parts[0];
    isSegment = true;
    segmentFilename = parts.slice(1).join("/");
  }

  // FIX: Match against generated index calculation (index + 1) because raw data objects don't contain stream_id
  const targetIndex = Number(cleanId) - 1;
  const stream = LiveTVList[targetIndex];

  if (!stream) {
    console.warn(
      `Stream not found for param: ${fullStreamParam} (Cleaned ID Index: ${cleanId})`,
    );
    return res.status(404).send("Stream not found");
  }

  try {
    // If it's a sub-segment file (like init.hls.fmp4), target its absolute home folder location
    let targetUrl = stream.direct_source;
    if (isSegment) {
      const parsedBase = new URL(stream.direct_source);
      const baseDir = parsedBase.href.substring(
        0,
        parsedBase.href.lastIndexOf("/") + 1,
      );
      targetUrl = `${baseDir}${segmentFilename}`;
    }

    const response = await fetch(targetUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
    });

    if (!response.ok) {
      console.error(
        `Failed to fetch from ${targetUrl}. Status: ${response.status}`,
      );
      return res.status(response.status).send("Upstream source unreachable");
    }

    const contentType = response.headers.get("content-type") || "";
    res.setHeader("Access-Control-Allow-Origin", "*");

    // Handle playlist indexes
    if (
      !isSegment &&
      (stream.direct_source.endsWith(".m3u8") ||
        contentType.includes("mpegurl") ||
        contentType.includes("application/x-mpegURL"))
    ) {
      let manifestText = await response.text();

      if (manifestText.includes("#EXTM3U")) {
        const updatedLines = manifestText.split("\n").map((line) => {
          const trimmed = line.trim();
          if (trimmed.startsWith("#") || trimmed === "") return line;

          // If already absolute link, leave it intact
          if (trimmed.startsWith("http://") || trimmed.startsWith("https://"))
            return line;

          // Rewrite chunk routes to point back through our proxy while saving the channel context ID
          if (trimmed.startsWith("/")) {
            return `${req.protocol}://${req.get("host")}/live/${username}/${password}/${cleanId}${trimmed}`;
          }
          return `${req.protocol}://${req.get("host")}/live/${username}/${password}/${cleanId}/${trimmed}`;
        });

        manifestText = updatedLines.join("\n");
      }

      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      return res.send(manifestText);
    }

    // Binary segment streaming for video chunks, initialization frames, and video assets
    res.setHeader("Content-Type", contentType || "video/mp4");
    if (response.headers.get("content-length")) {
      res.setHeader("Content-Length", response.headers.get("content-length")!);
    }

    const reader = response.body?.getReader();
    if (!reader) return res.end();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    return res.end();
  } catch (error) {
    console.error("Error occurred while fetching live stream:", error);
    return res.status(500).send("Internal Streaming Error");
  }
}

app.listen(3000, "0.0.0.0");

export default app;