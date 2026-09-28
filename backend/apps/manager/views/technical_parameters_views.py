from decimal import Decimal
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from apps.performance.models import PerformanceCycle, TechnicalCapabilityParameter
from .base import IsManagerUser


# =====================================================================
# M-04: MANAGE TECHNICAL CAPABILITY PARAMETERS
# =====================================================================
class ManagerTechnicalParametersView(APIView):
    """
    Feature M-04: Manage Technical Capability Parameters
    Add and configure technical capability parameters relevant to evaluation.
    Available to Mentors and HR.
    """
    permission_classes = [IsManagerUser]

    def get(self, request):
        params = TechnicalCapabilityParameter.objects.filter(is_active=True).order_by('category', 'name')
        data = [{
            'id': str(p.id),
            'name': p.name,
            'category': p.category,
            'description': p.description,
            'benchmarkScore': float(p.benchmark_score),
            'weight': float(p.weight),
            'cycleId': str(p.cycle.id) if p.cycle else None,
            'cycleName': p.cycle.name if p.cycle else 'All Cycles',
            'createdAt': p.created_at.strftime('%Y-%m-%d'),
        } for p in params]

        return Response({
            'code': 200,
            'message': 'Technical capability parameters retrieved.',
            'data': data
        })

    def post(self, request):
        name = request.data.get('name', '').strip()
        category = request.data.get('category', 'Technical Capability').strip()
        description = request.data.get('description', '').strip()
        benchmark_score = request.data.get('benchmark_score') or request.data.get('benchmarkScore', 5.0)
        weight = request.data.get('weight', 20.0)
        cycle_id = request.data.get('cycle_id') or request.data.get('cycleId')

        if not name:
            return Response({'code': 400, 'message': 'Parameter name is required.'}, status=status.HTTP_400_BAD_REQUEST)

        cycle = PerformanceCycle.objects.filter(id=cycle_id).first() if cycle_id else None

        param = TechnicalCapabilityParameter.objects.create(
            name=name,
            category=category,
            description=description,
            benchmark_score=Decimal(str(benchmark_score)),
            weight=Decimal(str(weight)),
            cycle=cycle,
            created_by=request.user,
        )

        return Response({
            'code': 201,
            'message': f'Technical parameter "{param.name}" configured successfully.',
            'data': {
                'id': str(param.id),
                'name': param.name,
                'category': param.category,
                'description': param.description,
                'benchmarkScore': float(param.benchmark_score),
                'weight': float(param.weight),
            }
        }, status=status.HTTP_201_CREATED)


class ManagerTechnicalParameterDetailView(APIView):
    """Update or deactivate a technical capability parameter."""
    permission_classes = [IsManagerUser]

    def patch(self, request, pk):
        param = TechnicalCapabilityParameter.objects.filter(id=pk).first()
        if not param:
            return Response({'code': 404, 'message': 'Parameter not found.'}, status=status.HTTP_404_NOT_FOUND)

        if 'name' in request.data:
            param.name = request.data['name'].strip()
        if 'category' in request.data:
            param.category = request.data['category'].strip()
        if 'description' in request.data:
            param.description = request.data['description'].strip()
        if 'benchmark_score' in request.data or 'benchmarkScore' in request.data:
            param.benchmark_score = Decimal(str(request.data.get('benchmark_score') or request.data.get('benchmarkScore')))
        if 'weight' in request.data:
            param.weight = Decimal(str(request.data['weight']))

        param.save()
        return Response({'code': 200, 'message': 'Parameter updated successfully.'})

    def delete(self, request, pk):
        param = TechnicalCapabilityParameter.objects.filter(id=pk).first()
        if not param:
            return Response({'code': 404, 'message': 'Parameter not found.'}, status=status.HTTP_404_NOT_FOUND)

        param.is_active = False
        param.save()
        return Response({'code': 200, 'message': 'Parameter deactivated.'})
