/* OmniMount - formateo de valores para la interfaz (es-ES). */
(function (global) {
  'use strict';

  const UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

  function bytes(value, decimals) {
    const num = Number(value) || 0;
    if (num < 1) return '0 B';
    const exp = Math.min(Math.floor(Math.log(num) / Math.log(1024)), UNITS.length - 1);
    const scaled = num / 1024 ** exp;
    const places = decimals !== undefined ? decimals : scaled < 10 && exp > 0 ? 1 : 0;
    return `${scaled.toLocaleString('es-ES', {
      minimumFractionDigits: places,
      maximumFractionDigits: places,
    })} ${UNITS[exp]}`;
  }

  /** Split a byte size so the unit can be styled apart from the number. */
  function bytesParts(value) {
    const text = bytes(value);
    const at = text.lastIndexOf(' ');
    return { value: text.slice(0, at), unit: text.slice(at + 1) };
  }

  function speed(bytesPerSecond) {
    const num = Number(bytesPerSecond) || 0;
    if (num < 1) return '0 B/s';
    return `${bytes(num)}/s`;
  }

  function number(value) {
    return (Number(value) || 0).toLocaleString('es-ES');
  }

  function percent(value, decimals) {
    const num = Number(value) || 0;
    return `${num.toLocaleString('es-ES', {
      minimumFractionDigits: decimals || 0,
      maximumFractionDigits: decimals || 0,
    })} %`;
  }

  function duration(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    const d = Math.floor(total / 86400);
    const hrs = Math.floor((total % 86400) / 3600);
    const min = Math.floor((total % 3600) / 60);
    const sec = total % 60;

    if (d) return `${d} d ${hrs} h`;
    if (hrs) return `${hrs} h ${String(min).padStart(2, '0')} min`;
    if (min) return `${min} min ${String(sec).padStart(2, '0')} s`;
    return `${sec} s`;
  }

  function dateTime(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function timeOnly(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  function relative(value) {
    if (!value) return '—';
    const then = new Date(value).getTime();
    if (Number.isNaN(then)) return '—';
    const seconds = Math.round((Date.now() - then) / 1000);

    if (seconds < 45) return 'hace unos segundos';
    if (seconds < 90) return 'hace un minuto';
    if (seconds < 3600) return `hace ${Math.round(seconds / 60)} min`;
    if (seconds < 86400) {
      const hrs = Math.round(seconds / 3600);
      return `hace ${hrs} ${hrs === 1 ? 'hora' : 'horas'}`;
    }
    const days = Math.round(seconds / 86400);
    if (days < 31) return `hace ${days} ${days === 1 ? 'día' : 'días'}`;
    return dateTime(value);
  }

  function pluralise(count, singular, plural) {
    return `${number(count)} ${count === 1 ? singular : plural}`;
  }

  /** Shorten a long S3 key for display without losing the file name. */
  function middleEllipsis(text, max) {
    const value = String(text || '');
    const limit = max || 48;
    if (value.length <= limit) return value;
    const keepEnd = Math.floor(limit * 0.6);
    const keepStart = limit - keepEnd - 1;
    return `${value.slice(0, keepStart)}…${value.slice(-keepEnd)}`;
  }

  global.OM = global.OM || {};
  global.OM.fmt = {
    bytes,
    bytesParts,
    speed,
    number,
    percent,
    duration,
    dateTime,
    timeOnly,
    relative,
    pluralise,
    middleEllipsis,
  };
})(window);
