#from django.shortcuts import render

# Create your views here.

from django.shortcuts import render


def index(req):
    return render(req, 'drone/index.html')