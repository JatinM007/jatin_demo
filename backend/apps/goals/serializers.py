from rest_framework import serializers
from decimal import Decimal
from apps.goals.models import Goal, KPI, GoalProgress
from apps.performance.models import PerformanceCycle


class KPISerializer(serializers.ModelSerializer):
    achievement_percentage = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        read_only=True
    )

    class Meta:
        model = KPI
        fields = (
            'id', 'goal', 'name', 'description', 'target_value',
            'achieved_value', 'unit', 'measurement_type',
            'achievement_percentage', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'created_at', 'updated_at')

class GoalProgressSerializer(serializers.ModelSerializer):
    updated_by_name = serializers.CharField(source='updated_by.username', read_only=True)

    class Meta:
        model = GoalProgress
        fields = ('id', 'goal', 'updated_by', 'updated_by_name', 'progress_percentage', 'comment', 'created_at')
        read_only_fields = ('id', 'updated_by', 'created_at')

class GoalSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_code = serializers.CharField(source='employee.employee_code', read_only=True)
    cycle = serializers.PrimaryKeyRelatedField(queryset=PerformanceCycle.objects.all(), required=False, allow_null=True)
    cycle_name = serializers.CharField(source='cycle.name', read_only=True)
    assigned_by_name = serializers.CharField(source='assigned_by.username', read_only=True)
    due_date = serializers.DateField(required=False, allow_null=True)
    kpis = KPISerializer(many=True, read_only=True)
    recent_progress = serializers.SerializerMethodField()

    class Meta:
        model = Goal
        fields = (
            'id', 'employee', 'employee_name', 'employee_code', 'cycle', 'cycle_name',
            'assigned_by', 'assigned_by_name', 'title', 'description', 'due_date',
            'status', 'priority', 'completion_percentage', 'kpis', 'recent_progress',
            'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'assigned_by', 'created_at', 'updated_at')

    def get_recent_progress(self, obj):
        updates = obj.progress_updates.all()[:3]
        return GoalProgressSerializer(updates, many=True).data

class LogProgressSerializer(serializers.Serializer):
    progress_percentage = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        min_value=Decimal('0.00'),
        max_value=Decimal('100.00')
    )
    comment = serializers.CharField(required=True)
