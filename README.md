# Free Kurdish TV Xtream API

> IMPORTANT!
> All links are public links sourced directly from the original providers of the live TV streams. WE ARE NOT HOSTING/STREAMING!

This is a free and legal Xtream API for Kurdish TV channels. It provides access to a variety of Kurdish TV channels, including news, entertainment, and sports channels.

| data     | value                  |
| -------- | ---------------------- |
| name     | rwdlol                 |
| username | rwdlol                 |
| password | rwdlol                 |
| url      | https://xtream.rwd.lol |

## Xtream API Documentation

### Auth

```text
GET <url>/player_api.php?username=<user>&password=<pwd>
```

### M3U

```text
GET <url>/get.php?username=<user>&password=<pwd>&type=m3u_plus&output=ts
```

```text
GET <url>/get.php?username=<user>&password=<pwd>&type=m3u_plus&output=m3u8
```

### Live TV

| Endpoint    | URL                                                                                       |
| ----------- | ----------------------------------------------------------------------------------------- |
| All Streams | `/player_api.php?username=<user>&password=<pwd>&action=get_live_streams`                  |
| Categories  | `/player_api.php?username=<user>&password=<pwd>&action=get_live_categories`               |
| By Category | `/player_api.php?username=<user>&password=<pwd>&action=get_live_streams&category_id=<id>` |

### Movies (VOD)

| Endpoint    | URL                                                                                      |
| ----------- | ---------------------------------------------------------------------------------------- |
| All Streams | `/player_api.php?username=<user>&password=<pwd>&action=get_vod_streams`                  |
| Categories  | `/player_api.php?username=<user>&password=<pwd>&action=get_vod_categories`               |
| By Category | `/player_api.php?username=<user>&password=<pwd>&action=get_vod_streams&category_id=<id>` |
| Details     | `/player_api.php?username=<user>&password=<pwd>&action=get_vod_info&vod_id=<id>`         |

### Series (TV Shows)

| Endpoint    | URL                                                                                 |
| ----------- | ----------------------------------------------------------------------------------- |
| All Series  | `/player_api.php?username=<user>&password=<pwd>&action=get_series`                  |
| Categories  | `/player_api.php?username=<user>&password=<pwd>&action=get_series_categories`       |
| By Category | `/player_api.php?username=<user>&password=<pwd>&action=get_series&category_id=<id>` |
| Details     | `/player_api.php?username=<user>&password=<pwd>&action=get_series_info&series=<id>` |
