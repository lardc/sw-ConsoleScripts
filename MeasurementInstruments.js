include("Tektronix.js")
include("DMM6500.js")

function InitMeasurementInstrument(COMports)
{
	for (var i = 0; i < COMports.length; i++)
	{
		TEK_PortInit(COMports[i]);
		var result = "";

		try { result = TEK_Exec("ID?"); } catch (e) {}

		if (result.indexOf("ID") >= 0)
			return COMports[i];
	}
}
