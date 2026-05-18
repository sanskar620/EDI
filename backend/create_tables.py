from app.database import engine, Base
import pkgutil
import importlib
import app.models

print("Importing all models...")
for _, module_name, _ in pkgutil.iter_modules(app.models.__path__):
    importlib.import_module(f"app.models.{module_name}")

print("Creating database tables...")
Base.metadata.create_all(bind=engine)
print("Done.")
