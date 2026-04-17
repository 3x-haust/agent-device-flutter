import 'dart:convert';
import 'dart:developer' as developer;
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

/// Registers service extensions used by the `agent-device-flutter` CLI to
/// drive the app through the Dart VM Service.
///
/// Call [AgentDeviceFlutterRuntime.attach] before `runApp` in `main`:
///
/// ```dart
/// void main() {
///   AgentDeviceFlutterRuntime.attach();
///   runApp(const MyApp());
/// }
/// ```
///
/// The runtime is a no-op in release builds.
class AgentDeviceFlutterRuntime {
  AgentDeviceFlutterRuntime._();

  static bool _attached = false;

  static void attach() {
    if (_attached) return;
    if (kReleaseMode) return;
    _attached = true;
    WidgetsFlutterBinding.ensureInitialized();
    WidgetsBinding.instance.ensureSemantics();
    developer.registerExtension('ext.agentDeviceFlutter.ping', _ping);
    developer.registerExtension('ext.agentDeviceFlutter.snapshot', _snapshot);
    developer.registerExtension('ext.agentDeviceFlutter.tap', _tap);
    developer.registerExtension('ext.agentDeviceFlutter.fill', _fill);
    developer.registerExtension('ext.agentDeviceFlutter.scroll', _scroll);
  }

  static Future<developer.ServiceExtensionResponse> _ping(
    String method,
    Map<String, String> parameters,
  ) async {
    return developer.ServiceExtensionResponse.result(
      jsonEncode(<String, Object?>{'ok': true, 'version': '1.0.0'}),
    );
  }

  static Future<developer.ServiceExtensionResponse> _snapshot(
    String method,
    Map<String, String> parameters,
  ) async {
    final root = WidgetsBinding.instance.pipelineOwner.semanticsOwner?.rootSemanticsNode;
    if (root == null) {
      return developer.ServiceExtensionResponse.result(
        jsonEncode(<String, Object?>{'root': null, 'error': 'semantics not enabled'}),
      );
    }
    final tree = _serializeSemantics(root);
    return developer.ServiceExtensionResponse.result(jsonEncode(<String, Object?>{'root': tree}));
  }

  static Future<developer.ServiceExtensionResponse> _tap(
    String method,
    Map<String, String> parameters,
  ) async {
    final x = double.tryParse(parameters['x'] ?? '');
    final y = double.tryParse(parameters['y'] ?? '');
    if (x == null || y == null) {
      return _error('tap requires x,y (logical pixels)');
    }
    final pointer = int.tryParse(parameters['pointer'] ?? '') ?? 91;
    final binding = WidgetsBinding.instance;
    final pos = Offset(x, y);
    binding.handlePointerEvent(PointerDownEvent(pointer: pointer, position: pos));
    await Future<void>.delayed(const Duration(milliseconds: 40));
    binding.handlePointerEvent(PointerUpEvent(pointer: pointer, position: pos));
    return developer.ServiceExtensionResponse.result(jsonEncode(<String, Object?>{'ok': true}));
  }

  static Future<developer.ServiceExtensionResponse> _fill(
    String method,
    Map<String, String> parameters,
  ) async {
    final text = parameters['text'];
    if (text == null) return _error('fill requires text');
    final clear = (parameters['clear'] ?? 'true').toLowerCase() != 'false';
    await _ensureFieldFocused(parameters);
    final editable = _findFocusedEditableText();
    if (editable == null) return _error('no focused EditableText');
    final controller = editable.widget.controller;
    final base = clear ? text : controller.text + text;
    controller.value = TextEditingValue(
      text: base,
      selection: TextSelection.collapsed(offset: base.length),
    );
    return developer.ServiceExtensionResponse.result(jsonEncode(<String, Object?>{'ok': true}));
  }

  static Future<developer.ServiceExtensionResponse> _scroll(
    String method,
    Map<String, String> parameters,
  ) async {
    final direction = parameters['direction'] ?? 'down';
    final amount = double.tryParse(parameters['amount'] ?? '') ?? 200;
    final x = double.tryParse(parameters['x'] ?? '');
    final y = double.tryParse(parameters['y'] ?? '');
    if (x == null || y == null) return _error('scroll requires x,y (start point)');
    final pointer = int.tryParse(parameters['pointer'] ?? '') ?? 92;
    final start = Offset(x, y);
    final end = _offsetFor(direction, start, amount);
    final binding = WidgetsBinding.instance;
    binding.handlePointerEvent(PointerDownEvent(pointer: pointer, position: start));
    const steps = 10;
    for (var i = 1; i <= steps; i++) {
      final t = i / steps;
      final p = Offset.lerp(start, end, t)!;
      binding.handlePointerEvent(PointerMoveEvent(pointer: pointer, position: p));
      await Future<void>.delayed(const Duration(milliseconds: 8));
    }
    binding.handlePointerEvent(PointerUpEvent(pointer: pointer, position: end));
    return developer.ServiceExtensionResponse.result(jsonEncode(<String, Object?>{'ok': true}));
  }

  static Future<void> _ensureFieldFocused(Map<String, String> parameters) async {
    final x = double.tryParse(parameters['focusX'] ?? '');
    final y = double.tryParse(parameters['focusY'] ?? '');
    if (x == null || y == null) return;
    final binding = WidgetsBinding.instance;
    final pos = Offset(x, y);
    binding.handlePointerEvent(PointerDownEvent(pointer: 93, position: pos));
    await Future<void>.delayed(const Duration(milliseconds: 30));
    binding.handlePointerEvent(PointerUpEvent(pointer: 93, position: pos));
    await Future<void>.delayed(const Duration(milliseconds: 80));
  }

  static EditableTextState? _findFocusedEditableText() {
    final focus = WidgetsBinding.instance.focusManager.primaryFocus;
    final ctx = focus?.context;
    if (ctx == null) return null;
    EditableTextState? found;
    void walk(Element el) {
      if (found != null) return;
      if (el is StatefulElement && el.state is EditableTextState) {
        found = el.state as EditableTextState;
        return;
      }
      el.visitChildren(walk);
    }

    (ctx as Element).visitChildren(walk);
    if (found != null) return found;
    // Fall back to walking up then down the tree.
    Element? cursor = ctx;
    while (cursor != null && found == null) {
      cursor.visitChildren(walk);
      cursor = _parentOf(cursor);
    }
    return found;
  }

  static Element? _parentOf(Element el) {
    Element? parent;
    el.visitAncestorElements((a) {
      parent = a;
      return false;
    });
    return parent;
  }

  static Offset _offsetFor(String direction, Offset start, double amount) {
    switch (direction) {
      case 'up':
        return Offset(start.dx, start.dy + amount);
      case 'down':
        return Offset(start.dx, start.dy - amount);
      case 'left':
        return Offset(start.dx + amount, start.dy);
      case 'right':
        return Offset(start.dx - amount, start.dy);
      default:
        return Offset(start.dx, start.dy - amount);
    }
  }

  static Map<String, Object?> _serializeSemantics(SemanticsNode node) {
    final data = node.getSemanticsData();
    final transform = node.transform;
    final rect = node.rect;
    double offsetX = 0, offsetY = 0;
    if (transform != null) {
      // Pure-translation transforms: entries 12,13 hold dx,dy.
      offsetX = transform.storage[12];
      offsetY = transform.storage[13];
    }
    final result = <String, Object?>{
      'id': node.id,
      'rect': <double>[
        rect.left + offsetX,
        rect.top + offsetY,
        rect.right + offsetX,
        rect.bottom + offsetY,
      ],
      'label': data.label,
      'value': data.value,
      'identifier': data.identifier,
      'flags': _flagNames(data.flags),
      'actions': _actionNames(data.actions),
      'textDirection': data.textDirection?.name,
      'children': <Map<String, Object?>>[],
    };
    final children = <Map<String, Object?>>[];
    node.visitChildren((child) {
      children.add(_serializeSemantics(child));
      return true;
    });
    result['children'] = children;
    return result;
  }

  static List<String> _flagNames(int flags) {
    final out = <String>[];
    for (final f in ui.SemanticsFlag.values) {
      if ((flags & f.index) != 0) out.add(_enumLeaf(f.toString()));
    }
    return out;
  }

  static List<String> _actionNames(int actions) {
    final out = <String>[];
    for (final a in ui.SemanticsAction.values) {
      if ((actions & a.index) != 0) out.add(_enumLeaf(a.toString()));
    }
    return out;
  }

  static String _enumLeaf(String raw) {
    final dot = raw.lastIndexOf('.');
    return dot >= 0 ? raw.substring(dot + 1) : raw;
  }

  static developer.ServiceExtensionResponse _error(String msg) {
    return developer.ServiceExtensionResponse.error(
      developer.ServiceExtensionResponse.invalidParams,
      msg,
    );
  }
}
