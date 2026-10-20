package expo.modules.djaudio

import android.content.ContentUris
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.provider.MediaStore

object KoroshMusicLibrary {
  fun list(context: Context): List<Map<String, Any>> {
    val permission = if (Build.VERSION.SDK_INT >= 33) android.Manifest.permission.READ_MEDIA_AUDIO
      else android.Manifest.permission.READ_EXTERNAL_STORAGE
    if (Build.VERSION.SDK_INT >= 23 && context.checkSelfPermission(permission) != PackageManager.PERMISSION_GRANTED) return emptyList()

    val result = mutableListOf<Map<String, Any>>()
    val collection = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI
    val projection = arrayOf(
      MediaStore.Audio.Media._ID,
      MediaStore.Audio.Media.TITLE,
      MediaStore.Audio.Media.ARTIST,
      MediaStore.Audio.Media.ALBUM,
      MediaStore.Audio.Media.DURATION
    )
    val selection = "${MediaStore.Audio.Media.DURATION} > 0"
    val sortOrder = "${MediaStore.Audio.Media.TITLE} COLLATE NOCASE ASC"
    try {
      context.contentResolver.query(collection, projection, selection, null, sortOrder)?.use { cursor ->
        val idIndex = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media._ID)
        val titleIndex = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.TITLE)
        val artistIndex = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST)
        val albumIndex = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM)
        val durationIndex = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION)
        while (cursor.moveToNext()) {
          val id = cursor.getLong(idIndex)
          val uri = ContentUris.withAppendedId(collection, id).toString()
          val title = cursor.getString(titleIndex)?.takeIf { it.isNotBlank() } ?: "آهنگ بدون نام"
          val artist = cursor.getString(artistIndex)?.takeIf { it.isNotBlank() && it != "<unknown>" } ?: "هنرمند نامشخص"
          val album = cursor.getString(albumIndex)?.takeIf { it.isNotBlank() && it != "<unknown>" } ?: "آلبوم نامشخص"
          val duration = cursor.getLong(durationIndex)
          result.add(mapOf("id" to id.toString(), "title" to title, "artist" to artist, "album" to album, "durationMs" to duration.toDouble(), "uri" to uri))
        }
      }
    } catch (_: Exception) {}
    return result
  }
}
