import 'package:flutter/material.dart';

import '../../../models/level_node.dart';
import '../../../theme.dart';

class LevelNodeWidget extends StatelessWidget {
  const LevelNodeWidget({
    super.key,
    required this.node,
    required this.onTap,
  });

  final LevelNode node;
  final VoidCallback onTap;

  static const double size = 52;

  @override
  Widget build(BuildContext context) {
    final locked = node.status == LevelStatus.locked;
    return Semantics(
      button: !locked,
      label: _label(node),
      child: GestureDetector(
        onTap: onTap,
        child: node.status == LevelStatus.current
            ? _PulseRing(child: _Badge(node: node))
            : _Badge(node: node),
      ),
    );
  }

  static String _label(LevelNode node) {
    return switch (node.status) {
      LevelStatus.locked => 'Level ${node.id}, locked',
      LevelStatus.unlocked => 'Level ${node.id}, unlocked',
      LevelStatus.current => 'Level ${node.id}, current level',
      LevelStatus.completed =>
        'Level ${node.id}, completed, ${node.stars} stars',
    };
  }
}

class _PulseRing extends StatefulWidget {
  const _PulseRing({required this.child});

  final Widget child;

  @override
  State<_PulseRing> createState() => _PulseRingState();
}

class _PulseRingState extends State<_PulseRing>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1100),
  )..repeat(reverse: true);

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ScaleTransition(
      scale: Tween(begin: 1.0, end: 1.08).animate(
        CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
      ),
      child: widget.child,
    );
  }
}

class _Badge extends StatelessWidget {
  const _Badge({required this.node});

  final LevelNode node;

  @override
  Widget build(BuildContext context) {
    final fill = switch (node.status) {
      LevelStatus.locked => AppColors.surfaceVariant,
      LevelStatus.unlocked => AppColors.teal,
      LevelStatus.current => AppColors.orange,
      LevelStatus.completed => AppColors.forestGreen,
    };
    final ring = switch (node.status) {
      LevelStatus.locked => AppColors.borderDark,
      LevelStatus.unlocked => AppColors.gold,
      LevelStatus.current => AppColors.gold,
      LevelStatus.completed => AppColors.gold,
    };

    return Container(
      width: LevelNodeWidget.size,
      height: LevelNodeWidget.size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: fill,
        border: Border.all(
            color: ring, width: node.status == LevelStatus.current ? 4 : 3),
        boxShadow: [
          BoxShadow(
            color: AppColors.navy.withValues(
                alpha: node.status == LevelStatus.current ? 0.28 : 0.12),
            blurRadius: node.status == LevelStatus.current ? 14 : 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      alignment: Alignment.center,
      child: _face(node),
    );
  }

  Widget _face(LevelNode node) {
    if (node.status == LevelStatus.locked) {
      return const Icon(Icons.lock_rounded,
          color: AppColors.textMuted, size: 22);
    }
    if (node.status == LevelStatus.completed) {
      return Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            '${node.id}',
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w900,
              fontSize: 13,
              height: 1,
            ),
          ),
          const SizedBox(height: 1),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              for (var i = 0; i < 3; i++)
                Icon(
                  i < node.stars
                      ? Icons.star_rounded
                      : Icons.star_border_rounded,
                  size: 8,
                  color: AppColors.gold,
                ),
            ],
          ),
        ],
      );
    }
    return Text(
      '${node.id}',
      style: const TextStyle(
        color: Colors.white,
        fontWeight: FontWeight.w900,
        fontSize: 16,
      ),
    );
  }
}
